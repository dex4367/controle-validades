import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes } from 'react-icons/fa';

/**
 * Propriedades do componente BarcodeScanner
 */
interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

/**
 * Componente para escaneamento de códigos de barras usando a câmera
 */
const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  // Referências e estados
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraCapabilities, setCameraCapabilities] = useState<{
    width: number;
    height: number;
  }>({ width: 1280, height: 720 }); // Valor padrão de alta resolução
  
  // Detecta as capacidades máximas da câmera
  useEffect(() => {
    async function getMaxCameraResolution() {
      try {
        // Tenta obter a câmera com a maior resolução possível
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 4096 }, // Requisita o máximo
            height: { ideal: 2160 }, // Requisita o máximo
          }
        });
        
        // Obtém as configurações reais que foram aceitas
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities();
        const settings = videoTrack.getSettings();
        
        // Vamos usar a resolução que o dispositivo realmente nos deu
        let bestWidth = settings.width || 1280;
        let bestHeight = settings.height || 720;
        
        console.log('Câmera iniciada com resolução:', bestWidth, 'x', bestHeight);
        
        // Limpa o stream de detecção
        stream.getTracks().forEach(track => track.stop());
        
        // Atualiza o estado com as melhores configurações
        setCameraCapabilities({
          width: bestWidth,
          height: bestHeight
        });
      } catch (error) {
        console.error('Erro ao detectar resolução máxima:', error);
        // Mantém a resolução padrão em caso de erro
      }
    }
    
    getMaxCameraResolution();
  }, []);
  
  // Inicializa o scanner de código de barras quando a câmera está pronta
  useEffect(() => {
    if (!isCameraReady) return;
    
    // Configuração otimizada para desempenho e precisão
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8, 
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true); // Mais preciso, mesmo que um pouco mais lento
    hints.set(DecodeHintType.ASSUME_GS1, false);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função de escaneamento aprimorada
    const scanBarcode = async () => {
      if (stopScanning || !webcamRef.current || processingRef.current) return;
      processingRef.current = true;
      
      try {
        const video = webcamRef.current.video;
        if (!video) {
          processingRef.current = false;
          return;
        }
        
        // Método direto quando disponível (mais rápido e preciso)
        if (codeReader.decodeFromVideoElement) {
          codeReader.decodeFromVideoElement(video)
            .then(result => {
              if (result && result.getText()) {
                // Verificar qualidade do código lido (comprimento esperado, etc)
                const text = result.getText().trim();
                
                // Verificação básica de qualidade para evitar falsas leituras
                if (text.length >= 8) {
                  console.log('Código detectado:', text);
                  onBarcodeDetected(text);
                  stopScanning = true;
                  
                  // Liberar recursos da câmera
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                  }
                }
              }
            })
            .catch(() => {
              // Silencia erros normais de não-detecção
            })
            .finally(() => {
              processingRef.current = false;
            });
        } else {
          // Fallback para screenshot com alta qualidade
          const screenshot = webcamRef.current.getScreenshot({
            width: cameraCapabilities.width,
            height: cameraCapabilities.height
          });
          
          if (screenshot) {
            const image = new Image();
            image.onload = () => {
              codeReader.decodeFromImage(image)
                .then(result => {
                  if (result && result.getText()) {
                    const text = result.getText().trim();
                    
                    // Verificação básica de qualidade
                    if (text.length >= 8) {
                      console.log('Código detectado (via screenshot):', text);
                      onBarcodeDetected(text);
                      stopScanning = true;
                      
                      // Liberar recursos da câmera
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                      }
                    }
                  }
                })
                .catch(() => {
                  // Silencia erros normais de não-detecção
                })
                .finally(() => {
                  processingRef.current = false;
                });
            };
            image.src = screenshot;
          } else {
            processingRef.current = false;
          }
        }
      } catch (e) {
        console.error('Erro durante o escaneamento:', e);
        processingRef.current = false;
      }
    };
    
    // Estratégia de escaneamento em três camadas para máxima sensibilidade
    // 1. Escaneamento contínuo de fundo
    scanIntervalRef.current = window.setInterval(scanBarcode, 200);
    
    // 2. Escaneamento rápido por 5 segundos (mais intensivo no início)
    const mediumScanInterval = window.setInterval(scanBarcode, 100);
    setTimeout(() => {
      if (mediumScanInterval) clearInterval(mediumScanInterval);
    }, 5000);
    
    // 3. Modo super-rápido para os 3 primeiros segundos
    const fastScanInterval = window.setInterval(scanBarcode, 40);
    setTimeout(() => {
      if (fastScanInterval) clearInterval(fastScanInterval);
    }, 3000);
    
    // Limpeza na desmontagem
    return () => {
      stopScanning = true;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (mediumScanInterval) {
        clearInterval(mediumScanInterval);
      }
      if (fastScanInterval) {
        clearInterval(fastScanInterval);
      }
      
      codeReader.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraReady, onBarcodeDetected, cameraCapabilities]);

  // Handler para quando a câmera está pronta
  const handleUserMedia = (stream: MediaStream) => {
    streamRef.current = stream;
    setIsCameraReady(true);
    
    // Configura foco automático e outras otimizações quando disponíveis
    try {
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        // Obter capacidades disponíveis
        const capabilities = videoTrack.getCapabilities();
        console.log('Capacidades da câmera:', capabilities);
        
        // Usar apenas capacidades suportadas padrão (ignorando focusMode que é experimental)
        try {
          // Em vez de tentar usar focusMode diretamente (não é padrão),
          // vamos confiar na configuração automática do navegador
          videoTrack.applyConstraints({
            advanced: [{}] // Aplica configurações avançadas sem especificar propriedades específicas
          }).catch((e) => {
            console.log('Erro ao aplicar configurações avançadas:', e);
          });
        } catch (e) {
          console.log('Erro ao configurar a câmera:', e);
        }
      }
    } catch (e) {
      // Ignora erros de compatibilidade
      console.log('Erro ao configurar a câmera:', e);
    }
  };

  // Handler para erro na inicialização da câmera
  const handleUserMediaError = (error: string | DOMException) => {
    console.error('Erro ao acessar a câmera:', error);
    setError('Não foi possível acessar a câmera.');
    setIsCameraReady(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-md mx-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-3 bg-brmania-green text-white">
          <h3 className="text-base font-medium px-1">Scanner de Código de Barras</h3>
          <button 
            onClick={onClose}
            className="text-white p-1 rounded-full hover:bg-green-700"
            aria-label="Fechar"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Área da câmera ou mensagem de erro */}
        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            {error}
          </div>
        ) : (
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.7} // Qualidade mais alta para melhor detecção
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 640, ideal: cameraCapabilities.width, max: cameraCapabilities.width },
                height: { min: 480, ideal: cameraCapabilities.height, max: cameraCapabilities.height },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, max: 60 }, // Taxa de quadros mais alta para melhor captura
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-64 object-cover"
              mirrored={false}
            />
            
            {/* Guia de escaneamento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-40 border-2 border-yellow-400 rounded-lg overflow-hidden">
                {/* Cantos do guia */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-yellow-400 -mt-0.5 -ml-0.5"></div>
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-yellow-400 -mt-0.5 -mr-0.5"></div>
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-yellow-400 -mb-0.5 -ml-0.5"></div>
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-yellow-400 -mb-0.5 -mr-0.5"></div>
                
                {/* Linha de escaneamento */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  width: '100%',
                  height: '2px',
                  backgroundColor: '#E30613',
                  boxShadow: '0 0 8px 2px rgba(227, 6, 19, 0.8)',
                  zIndex: 15
                }} className="animate-scan-line"></div>
              </div>
            </div>
            
            {/* Instruções */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <div className="bg-black bg-opacity-70 px-3 py-1 rounded-full">
                <p className="text-white text-xs">
                  Alinhe o código no retângulo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de cancelar */}
        <div className="p-3 bg-yellow-50 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-brmania-green text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
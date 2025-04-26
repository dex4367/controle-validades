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
  
  // Inicializa o scanner de código de barras quando a câmera está pronta
  useEffect(() => {
    if (!isCameraReady) return;
    
    // Configuração otimizada para desempenho
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128
    ]);
    hints.set(DecodeHintType.TRY_HARDER, false);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função de escaneamento
    const scanBarcode = async () => {
      if (stopScanning || !webcamRef.current || processingRef.current) return;
      processingRef.current = true;
      
      try {
        const video = webcamRef.current.video;
        if (!video) {
          processingRef.current = false;
          return;
        }
        
        // Método direto quando disponível
        if (codeReader.decodeFromVideoElement) {
          codeReader.decodeFromVideoElement(video)
            .then(result => {
              if (result && result.getText()) {
                onBarcodeDetected(result.getText());
                stopScanning = true;
                
                // Liberar recursos da câmera
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                }
              }
            })
            .catch(() => {})
            .finally(() => {
              processingRef.current = false;
            });
        } else {
          // Fallback para screenshot
          const screenshot = webcamRef.current.getScreenshot({
            width: 320,
            height: 240
          });
          
          if (screenshot) {
            const image = new Image();
            image.onload = () => {
              codeReader.decodeFromImage(image)
                .then(result => {
                  if (result && result.getText()) {
                    onBarcodeDetected(result.getText());
                    stopScanning = true;
                    
                    // Liberar recursos da câmera
                    if (streamRef.current) {
                      streamRef.current.getTracks().forEach(track => track.stop());
                    }
                  }
                })
                .catch(() => {})
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
        processingRef.current = false;
      }
    };
    
    // Estratégia em duas camadas: normal e rápida
    scanIntervalRef.current = window.setInterval(scanBarcode, 150);
    
    // Modo rápido inicial por 3 segundos
    const fastScanInterval = window.setInterval(scanBarcode, 50);
    setTimeout(() => {
      if (fastScanInterval) clearInterval(fastScanInterval);
    }, 3000);
    
    // Limpeza na desmontagem
    return () => {
      stopScanning = true;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (fastScanInterval) {
        clearInterval(fastScanInterval);
      }
      
      codeReader.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraReady, onBarcodeDetected]);

  // Handler para quando a câmera está pronta
  const handleUserMedia = (stream: MediaStream) => {
    streamRef.current = stream;
    setIsCameraReady(true);
    
    // Configura foco automático quando disponível
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        videoTrack.applyConstraints({
          advanced: [{ 
            // @ts-ignore - focusMode é suportado em navegadores modernos
            focusMode: 'continuous' 
          }]
        }).catch(() => {
          // Ignora erros de compatibilidade
        });
      }
    } catch (e) {
      // Ignora erros de compatibilidade
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
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-sm mx-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-2 bg-brmania-green text-white">
          <h3 className="text-sm font-medium px-1">Scanner BR Mania</h3>
          <button 
            onClick={onClose}
            className="text-white p-1 rounded-full hover:bg-green-700"
            aria-label="Fechar"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Área da câmera ou mensagem de erro */}
        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-1 text-xs">
            {error}
          </div>
        ) : (
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.3}
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 320, ideal: 640, max: 640 },
                height: { min: 240, ideal: 480, max: 480 },
                aspectRatio: 4/3,
                frameRate: { ideal: 15, max: 20 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-64 object-cover"
              mirrored={false}
            />
            
            {/* Guia de escaneamento */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-32 border-2 border-yellow-400 rounded-lg overflow-hidden">
                {/* Cantos do guia */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-400 -mt-0.5 -ml-0.5"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-400 -mt-0.5 -mr-0.5"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-400 -mb-0.5 -ml-0.5"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-400 -mb-0.5 -mr-0.5"></div>
                
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
                  Posicione o código no retângulo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de cancelar */}
        <div className="p-1 bg-yellow-50 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-brmania-green text-white px-4 py-1 rounded text-xs font-medium hover:bg-green-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
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
  const [scanAttempts, setScanAttempts] = useState(0);
  
  // Inicializa o scanner de código de barras quando a câmera está pronta
  useEffect(() => {
    if (!isCameraReady) return;
    
    // Configuração para maior performance e precisão
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true); // Aumenta a precisão
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função de escaneamento com múltiplas estratégias
    const scanBarcode = async () => {
      if (stopScanning || !webcamRef.current || processingRef.current) return;
      processingRef.current = true;
      
      try {
        const video = webcamRef.current.video;
        if (!video) {
          processingRef.current = false;
          return;
        }
        
        // Incrementa contador de tentativas para ajustar estratégia
        setScanAttempts(prev => prev + 1);
        
        // Tenta decodificar diretamente do elemento de vídeo primeiro
        try {
          const result = await codeReader.decodeFromVideoElement(video);
          if (result && result.getText()) {
            onBarcodeDetected(result.getText());
            stopScanning = true;
            
            // Liberar recursos da câmera
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
            }
            return;
          }
        } catch (e) {
          // Ignora e tenta o método alternativo
        }
        
        // Método alternativo com screenshot
        const screenshot = webcamRef.current.getScreenshot({
          width: 640, // Aumentado para melhor precisão
          height: 480
        });
        
        if (screenshot) {
          const image = new Image();
          image.onload = async () => {
            try {
              const result = await codeReader.decodeFromImage(image);
              if (result && result.getText()) {
                onBarcodeDetected(result.getText());
                stopScanning = true;
                
                // Liberar recursos da câmera
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                }
              }
            } catch (e) {
              // Ignora erros de decodificação
            } finally {
              processingRef.current = false;
            }
          };
          image.src = screenshot;
        } else {
          processingRef.current = false;
        }
      } catch (e) {
        processingRef.current = false;
      }
    };
    
    // Estratégia adaptativa: começa com escaneamentos frequentes, depois reduz
    // para economizar recursos, mas mantém alta taxa de sucesso
    const scanFrequency = scanAttempts > 20 ? 150 : 80;
    scanIntervalRef.current = window.setInterval(scanBarcode, scanFrequency);
    
    // Modo rápido contínuo por 5 segundos
    const fastScanInterval = window.setInterval(scanBarcode, 40);
    setTimeout(() => {
      if (fastScanInterval) clearInterval(fastScanInterval);
    }, 5000);
    
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
  }, [isCameraReady, onBarcodeDetected, scanAttempts]);

  // Handler para quando a câmera está pronta
  const handleUserMedia = (stream: MediaStream) => {
    streamRef.current = stream;
    setIsCameraReady(true);
    
    // Configura foco automático e outras otimizações quando disponíveis
    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
        videoTrack.applyConstraints({
          advanced: [{ 
            // @ts-ignore - focusMode é suportado em navegadores modernos
            focusMode: 'continuous',
            // @ts-ignore - ajustes adicionais para melhor detecção
            exposureMode: 'continuous',
            whiteBalanceMode: 'continuous',
            brightness: 1,
            sharpness: 2
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

  // Função para tentar nova leitura manualmente
  const handleRetryCapture = () => {
    setScanAttempts(0); // Reinicia o contador para adotar estratégia mais agressiva
    processingRef.current = false; // Libera o processamento
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
              screenshotQuality={0.7} // Melhor qualidade
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 480, ideal: 720, max: 1280 }, // Maior resolução
                height: { min: 360, ideal: 540, max: 960 },
                aspectRatio: 4/3,
                frameRate: { min: 15, ideal: 30, max: 30 }, // Maior taxa de quadros
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
                  backgroundColor: '#FF0000', // Vermelho mais forte
                  boxShadow: '0 0 10px 3px rgba(255, 0, 0, 0.8)', // Brilho mais forte
                  zIndex: 15
                }} className="animate-scan-line"></div>
              </div>
            </div>
            
            {/* Instruções */}
            <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center">
              <div className="bg-black bg-opacity-70 px-3 py-1 rounded-full mb-2">
                <p className="text-white text-xs">
                  Posicione o código no retângulo
                </p>
              </div>
              
              {/* Botão para nova tentativa */}
              <button 
                onClick={handleRetryCapture}
                className="bg-yellow-500 text-black text-xs px-3 py-1 rounded-full"
              >
                Tentar novamente
              </button>
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
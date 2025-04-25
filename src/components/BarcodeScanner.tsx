import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes } from 'react-icons/fa';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    // Configuração ultra rápida
    const hints = new Map();
    // Apenas os formatos essenciais para máxima velocidade
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
    ]);
    
    // Configurações para máxima velocidade e flexibilidade
    hints.set(DecodeHintType.TRY_HARDER, false);
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;

    // Função simplificada para escaneamento rápido 
    const scanBarcode = () => {
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current) return;
      
      processingRef.current = true;
      
      try {
        // Obter screenshot em baixa qualidade para processamento rápido
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          // Método direto para processamento rápido
          const image = new Image();
          image.src = imageSrc;
          
          image.onload = () => {
            try {
              // Processar imagem imediatamente
              codeReader.decodeFromImage(image)
                .then(result => {
                  if (result && result.getText()) {
                    // Código detectado!
                    onBarcodeDetected(result.getText());
                    stopScanning = true;
                  }
                })
                .catch(() => {
                  // Ignorar erros, continuar escaneamento
                })
                .finally(() => {
                  processingRef.current = false;
                });
            } catch (e) {
              // Apenas liberar o processamento
              processingRef.current = false;
            }
          };
          
          image.onerror = () => {
            processingRef.current = false;
          };
        } else {
          processingRef.current = false;
        }
      } catch (e) {
        processingRef.current = false;
      }
    };

    if (isCameraReady) {
      // Escaneamento agressivo - múltiplas estratégias em paralelo
      
      // Estratégia 1: Intervalos curtos e frequentes
      scanIntervalRef.current = window.setInterval(scanBarcode, 100);
      
      // Estratégia 2: Processamento via frame animation
      const animFrame = () => {
        if (!stopScanning) {
          scanBarcode();
          requestAnimationFrame(animFrame);
        }
      };
      requestAnimationFrame(animFrame);
    }

    return () => {
      stopScanning = true;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      codeReader.reset();
    };
  }, [isCameraReady, onBarcodeDetected]);

  const handleUserMedia = () => {
    setIsCameraReady(true);
    setError(null);
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error('Erro ao acessar a câmera:', error);
    setError('Não foi possível acessar a câmera. Verifique as permissões.');
    setIsCameraReady(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-11/12 max-w-sm">
        {/* Cabeçalho simplificado */}
        <div className="flex justify-between items-center p-2 bg-blue-600 text-white">
          <h3 className="text-base font-medium">Scanner Rápido</h3>
          <button 
            onClick={onClose}
            className="text-white p-1 rounded-full hover:bg-blue-700 transition-colors"
            aria-label="Fechar"
          >
            <FaTimes />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3">
            {error}
          </div>
        ) : (
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.5} // Reduzir ainda mais a qualidade para velocidade máxima
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 320, ideal: 640, max: 1280 }, // Reduzir resolução para processamento mais rápido
                height: { min: 240, ideal: 480, max: 720 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 15 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-56 object-cover"
              mirrored={false}
            />
            
            {/* Sem área de foco específica - detecção em qualquer lugar */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  Aponte para qualquer código de barras
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-2 bg-gray-50">
          <div className="flex justify-center">
            <button 
              onClick={onClose}
              className="bg-gray-200 text-gray-800 px-4 py-1 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
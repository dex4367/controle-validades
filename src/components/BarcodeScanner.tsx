import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes, FaBolt } from 'react-icons/fa';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

// Versão ultra-simplificada da validação para máxima velocidade
function isValidBarcode(code: string): boolean {
  return Boolean(code && code.length > 5 && /^[A-Za-z0-9]+$/.test(code));
}

const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastProcessedTimestampRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Criar canvas ao montar
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;  // Resolução ultra-baixa
    canvas.height = 240;
    canvasRef.current = canvas;
    contextRef.current = canvas.getContext('2d');
    
    return () => {
      canvasRef.current = null;
      contextRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Configuração de máxima velocidade
    const hints = new Map();
    
    // Apenas um formato para máxima velocidade
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
    ]);
    
    // Desativar verificações adicionais para velocidade
    hints.set(DecodeHintType.TRY_HARDER, false);
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função ultra-otimizada sem validações adicionais
    const scanBarcode = () => {
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current) return;
      
      processingRef.current = true;
      
      try {
        const video = webcamRef.current.video;
        if (!video || !contextRef.current || !canvasRef.current) {
          processingRef.current = false;
          return;
        }
        
        // Método direto, sem captura de screenshot
        contextRef.current.drawImage(
          video,
          0, 0, video.videoWidth, video.videoHeight,
          0, 0, canvasRef.current.width, canvasRef.current.height
        );
        
        const imageData = contextRef.current.getImageData(
          0, 0, canvasRef.current.width, canvasRef.current.height
        );
        
        // Converter imageData para HTML image para usar com o decoder
        const canvas = canvasRef.current;
        const dataURL = canvas.toDataURL('image/jpeg', 0.5);
        const image = new Image();
        
        image.onload = () => {
          // Usar o método correto do codeReader
          codeReader.decodeFromImage(image)
            .then((result) => {
              if (result && result.getText()) {
                const text = result.getText();
                
                // Validação mínima - apenas verificar se não está vazio
                if (isValidBarcode(text)) {
                  onBarcodeDetected(text);
                  stopScanning = true;
                }
              }
            })
            .catch(() => {})
            .finally(() => {
              processingRef.current = false;
            });
        };
        
        image.src = dataURL;
        image.onerror = () => {
          processingRef.current = false;
        };
      } catch (e) {
        processingRef.current = false;
      }
    };

    if (isCameraReady) {
      // Escaneamento ultra-agressivo
      
      // Múltiplos intervalos paralelos para garantir máxima velocidade
      scanIntervalRef.current = window.setInterval(scanBarcode, 30); // 33 tentativas/segundo
      
      // Processamento via frame animation
      const animFrame = () => {
        if (!stopScanning) {
          scanBarcode();
          requestAnimationFrame(animFrame);
        }
      };
      requestAnimationFrame(animFrame);
      
      // Boost inicial extremo
      const rapidIntervals: number[] = [];
      for (let i = 0; i < 5; i++) {
        // Múltiplos scanners paralelos com delays variados
        const interval = window.setInterval(scanBarcode, 10 + i*3);
        rapidIntervals.push(interval);
      }
      
      // Limpar boost após 3 segundos
      setTimeout(() => {
        rapidIntervals.forEach(interval => clearInterval(interval));
      }, 3000);
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
    setError('Não foi possível acessar a câmera.');
    setIsCameraReady(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-sm mx-4">
        <div className="flex justify-between items-center p-1 bg-blue-600 text-white">
          <h3 className="text-xs font-medium px-1">Scanner Turbinado</h3>
          <button 
            onClick={onClose}
            className="text-white p-1"
            aria-label="Fechar"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-1 text-xs">
            {error}
          </div>
        ) : (
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 320, ideal: 640, max: 1280 },
                height: { min: 240, ideal: 480, max: 720 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 20 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-48 object-cover"
              mirrored={false}
            />
            
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-black bg-opacity-50 px-2 py-0.5 rounded-full flex items-center">
                <FaBolt className="text-yellow-400 mr-1" size={12} />
                <p className="text-white text-xs">
                  Aproxime o código
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-0.5 bg-gray-50 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
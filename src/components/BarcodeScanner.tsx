import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes, FaBolt } from 'react-icons/fa';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Criar canvas ao montar
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;  // Resolução micro
    canvas.height = 180;
    canvasRef.current = canvas;
    contextRef.current = canvas.getContext('2d');
    
    return () => {
      canvasRef.current = null;
      contextRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Configuração super-básica
    const hints = new Map();
    
    // Incluir TODOS os formatos de código de barras comuns
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8, 
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
    ]);
    
    // Configuração para máxima detecção
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função ultra-rápida sem qualquer validação
    const scanBarcode = () => {
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current) return;
      
      processingRef.current = true;
      
      try {
        if (webcamRef.current.getScreenshot) {
          // Método direto - screenshot
          const screenshot = webcamRef.current.getScreenshot({
            width: 240,
            height: 180
          });
          
          if (screenshot) {
            const image = new Image();
            image.onload = () => {
              codeReader.decodeFromImage(image)
                .then(result => {
                  if (result && result.getText()) {
                    // ZERO validação - aceitar qualquer código detectado
                    onBarcodeDetected(result.getText());
                    stopScanning = true;
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
        } else {
          processingRef.current = false;
        }
      } catch (e) {
        processingRef.current = false;
      }
    };

    if (isCameraReady) {
      // ESCANEAMENTO ULTRA-INTENSIVO
      
      // Método 1: RequestAnimationFrame (tão rápido quanto possível)
      const animFrame = () => {
        if (!stopScanning) {
          scanBarcode();
          requestAnimationFrame(animFrame);
        }
      };
      requestAnimationFrame(animFrame);
      
      // Método 2: Intervalos múltiplos em paralelo
      const intervals: number[] = [];
      
      // 10 scanners paralelos com frequências variadas
      for (let i = 0; i < 10; i++) {
        intervals.push(window.setInterval(scanBarcode, 10 + i * 2));
      }
      
      // Método 3: Intervalo principal constante
      scanIntervalRef.current = window.setInterval(scanBarcode, 30);
      
      // Limpar recursos paralelos após 5 segundos (mantém apenas o intervalo principal)
      setTimeout(() => {
        intervals.forEach(interval => clearInterval(interval));
      }, 5000);
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
          <h3 className="text-xs font-medium px-1">Scanner Instantâneo</h3>
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
              screenshotFormat="image/jpeg"
              screenshotQuality={0.1} // Qualidade ultra baixa para velocidade máxima
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 240, ideal: 480, max: 720 }, // Resolução reduzida
                height: { min: 180, ideal: 360, max: 540 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 15 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-48 object-cover"
              mirrored={false}
            />
            
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-black bg-opacity-50 px-2 py-0.5 rounded-full flex items-center animate-pulse">
                <FaBolt className="text-yellow-400 mr-1" size={12} />
                <p className="text-white text-xs">
                  Aproxime qualquer código
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
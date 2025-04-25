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
  const lastProcessedTimestampRef = useRef(0);

  useEffect(() => {
    // Configuração máxima velocidade 
    const hints = new Map();
    
    // Foco apenas nos formatos mais comuns e fáceis de detectar
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, // Formato mais comum para produtos
    ]);
    
    // Desativar TRY_HARDER para máxima velocidade (sem verificar todas as orientações)
    hints.set(DecodeHintType.TRY_HARDER, false);
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função ultra-otimizada
    const scanBarcode = () => {
      const now = Date.now();
      // Escaneamentos ainda mais frequentes
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current || 
          now - lastProcessedTimestampRef.current < 20) return;
      
      lastProcessedTimestampRef.current = now;
      processingRef.current = true;
      
      try {
        // Captura com qualidade mínima absoluta
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          const image = new Image();
          
          image.onload = () => {
            // Timeout reduzido para 50ms
            Promise.race([
              codeReader.decodeFromImage(image),
              new Promise((_, reject) => setTimeout(() => reject('timeout'), 50))
            ])
              .then((result: any) => {
                if (result && result.getText && result.getText()) {
                  const text = result.getText();
                  // Qualquer código mínimo válido
                  if (text && text.length > 1) {
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
          
          image.src = imageSrc;
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
      // Escaneamento ainda mais agressivo
      
      // Intervalos curtíssimos - 30ms (33 scans/segundo)
      scanIntervalRef.current = window.setInterval(scanBarcode, 30);
      
      // Processamento paralelo via requestAnimationFrame
      const animFrame = () => {
        if (!stopScanning) {
          scanBarcode();
          requestAnimationFrame(animFrame);
        }
      };
      requestAnimationFrame(animFrame);
      
      // Adicional: tentar a cada 10ms nos primeiros 2 segundos
      const rapidScan = window.setInterval(() => {
        if (!stopScanning) scanBarcode();
      }, 10);
      
      // Limpar depois de 2 segundos
      setTimeout(() => clearInterval(rapidScan), 2000);
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
          <h3 className="text-xs font-medium px-1">Scanner Ultra-Rápido</h3>
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
              screenshotQuality={0.2} // Qualidade super baixa: 20%
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 200, ideal: 320, max: 480 }, // Resolução mínima absoluta
                height: { min: 150, ideal: 240, max: 360 },
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
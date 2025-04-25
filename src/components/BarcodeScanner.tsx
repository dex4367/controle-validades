import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes, FaSync } from 'react-icons/fa';

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
    // Configuração ultra rápida para todas as orientações
    const hints = new Map();
    
    // Formatos essenciais mantendo velocidade
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    
    // Ativar leitura em TODAS as orientações possíveis
    hints.set(DecodeHintType.TRY_HARDER, true);
    // Detectar códigos de qualquer orientação (zxing usa TRY_HARDER para isso)
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função de verificação turbinada
    const scanBarcode = () => {
      const now = Date.now();
      // Limitar verificações a no máximo 30 por segundo (33ms)
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current || 
          now - lastProcessedTimestampRef.current < 33) return;
      
      lastProcessedTimestampRef.current = now;
      processingRef.current = true;
      
      try {
        // Configurar para baixíssima resolução = processamento ultra-rápido
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          // Método otimizado ao máximo
          const image = new Image();
          
          // Usar onload para evitar qualquer espera desnecessária
          image.onload = () => {
            // Usar Promise.race para limitar o tempo de processamento
            Promise.race([
              codeReader.decodeFromImage(image),
              new Promise((_, reject) => setTimeout(() => reject('timeout'), 150)) // Timeout de 150ms
            ])
              .then((result: any) => {
                if (result && result.getText && result.getText()) {
                  // Código detectado!
                  const text = result.getText();
                  if (text && text.length > 3) { // Verificação mínima
                    onBarcodeDetected(text);
                    stopScanning = true;
                  }
                }
              })
              .catch(() => {
                // Ignorar erros, continuar escaneamento
              })
              .finally(() => {
                processingRef.current = false;
              });
          };
          
          // Configurar para carregamento imediato
          image.src = imageSrc;
          
          // Tratamento de erro direto
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
      // Escaneamento extremamente agressivo - estratégias paralelas
      
      // 1: Intervalos ultra curtos (60ms = ~16 tentativas/segundo)
      scanIntervalRef.current = window.setInterval(scanBarcode, 60);
      
      // 2: Processamento via requestAnimationFrame (tão rápido quanto possível)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-sm mx-4">
        {/* Cabeçalho mínimo */}
        <div className="flex justify-between items-center p-1 bg-blue-600 text-white">
          <h3 className="text-sm font-medium px-1">Scanner Rápido</h3>
          <button 
            onClick={onClose}
            className="text-white p-1 rounded-full hover:bg-blue-700"
            aria-label="Fechar"
          >
            <FaTimes />
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-sm">
            {error}
          </div>
        ) : (
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.3} // Qualidade extremamente baixa para máximo desempenho
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 240, ideal: 480, max: 640 }, // Resolução mínima para máxima velocidade
                height: { min: 180, ideal: 360, max: 480 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 20 }, // Manter alto framerate
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-52 object-cover"
              mirrored={false}
            />
            
            {/* Interface mínima, indicando todas as direções possíveis */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-black bg-opacity-60 px-3 py-1 rounded-full flex items-center">
                <FaSync className="text-white animate-spin mr-1" />
                <p className="text-white text-xs">
                  Qualquer posição e orientação
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-1 bg-gray-50 flex justify-center">
          <button 
            onClick={onClose}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
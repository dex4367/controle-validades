import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes, FaBolt, FaExclamationTriangle } from 'react-icons/fa';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

// Função para validar se o código é válido
function isValidBarcode(code: string, format?: string): boolean {
  // Se não tiver o formato, assume que é válido (para compatibilidade)
  if (!format) return true;
  
  // Verificar se o código tem um comprimento mínimo
  if (!code || code.length < 8) return false;
  
  // Para códigos QR, tentar detectar se está invertido
  if (format === 'qr_code') {
    try {
      // Verificar se o conteúdo começa com formatos comuns
      const startsWithHttp = /^(http|https):\/\//.test(code);
      const isNumeric = /^\d+$/.test(code);
      const hasValidStructure = /^[A-Za-z0-9\-_]+$/.test(code);
      
      // Se o código contém caracteres muito estranhos, pode ser invertido
      const hasStrangeChars = /[^\x20-\x7E]/.test(code);
      
      return (startsWithHttp || isNumeric || hasValidStructure) && !hasStrangeChars;
    } catch (e) {
      return false;
    }
  }
  
  // Para códigos de barras padrão, verificar o comprimento
  if (format === 'ean_13') {
    return code.length === 13 && /^\d+$/.test(code);
  } else if (format === 'ean_8') {
    return code.length === 8 && /^\d+$/.test(code);
  } else if (['code_39', 'code_128'].includes(format)) {
    return code.length >= 8 && /^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(code);
  }
  
  // Por padrão, retornar verdadeiro para outros formatos
  return true;
}

const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastProcessedTimestampRef = useRef(0);
  const [invalidCodeCount, setInvalidCodeCount] = useState(0);
  const [showInvalidWarning, setShowInvalidWarning] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Configuração para balancear velocidade e precisão
    const hints = new Map();
    
    // Incluir formatos comuns com validação robusta
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, // Formato mais comum para produtos
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
    ]);
    
    // Configuração para melhor desempenho
    hints.set(DecodeHintType.TRY_HARDER, true); // Verificar em todas as orientações para maior precisão
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;
    
    // Função otimizada com validação robusta
    const scanBarcode = () => {
      const now = Date.now();
      // Limitar a taxa de verificação para evitar sobrecarga
      if (stopScanning || !webcamRef.current || !isCameraReady || processingRef.current || 
          now - lastProcessedTimestampRef.current < 50) return;
      
      lastProcessedTimestampRef.current = now;
      processingRef.current = true;
      
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          const image = new Image();
          
          image.onload = () => {
            Promise.race([
              codeReader.decodeFromImage(image),
              new Promise((_, reject) => setTimeout(() => reject('timeout'), 100))
            ])
              .then((result: any) => {
                if (result && result.getText && result.getText()) {
                  const text = result.getText();
                  const format = result.getBarcodeFormat 
                    ? result.getBarcodeFormat().toString().toLowerCase() 
                    : 'unknown';
                  
                  // Usar a função de validação robusta
                  if (isValidBarcode(text, format)) {
                    // Código válido - processar
                    onBarcodeDetected(text);
                    stopScanning = true;
                    setInvalidCodeCount(0);
                    setShowInvalidWarning(false);
                  } else {
                    // Código inválido ou invertido - feedback visual
                    if (scannerContainerRef.current) {
                      scannerContainerRef.current.classList.add('invalid-code');
                      setTimeout(() => {
                        if (scannerContainerRef.current) {
                          scannerContainerRef.current.classList.remove('invalid-code');
                        }
                      }, 500);
                    }
                    
                    // Incrementar contador de códigos inválidos
                    setInvalidCodeCount(prev => {
                      const newCount = prev + 1;
                      // Mostrar alerta após 3 tentativas inválidas
                      if (newCount >= 3) {
                        setShowInvalidWarning(true);
                        setTimeout(() => setShowInvalidWarning(false), 3000);
                        return 0;
                      }
                      return newCount;
                    });
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
      // Escaneamento agressivo mas balanceado
      
      // 1: Intervalo principal a cada 50ms (20 scans/segundo)
      scanIntervalRef.current = window.setInterval(scanBarcode, 50);
      
      // 2: Processamento paralelo via requestAnimationFrame
      const animFrame = () => {
        if (!stopScanning) {
          scanBarcode();
          requestAnimationFrame(animFrame);
        }
      };
      requestAnimationFrame(animFrame);
      
      // 3: Boost inicial para 2 segundos
      const rapidScan = window.setInterval(() => {
        if (!stopScanning) scanBarcode();
      }, 20);
      
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
          <div 
            className="relative bg-black scanner-container transition-all duration-300"
            ref={scannerContainerRef}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.4} // Equilíbrio entre qualidade e velocidade
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 320, ideal: 640, max: 1280 }, // Melhor equilíbrio resolução/performance
                height: { min: 240, ideal: 480, max: 720 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 20 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-48 object-cover"
              mirrored={false}
            />
            
            {/* Aviso de código inválido */}
            {showInvalidWarning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-yellow-600 text-white px-3 py-2 rounded-md flex items-center">
                  <FaExclamationTriangle className="mr-2" />
                  <p className="text-xs">
                    Código inválido ou invertido. Tente outra posição.
                  </p>
                </div>
              </div>
            )}
            
            {/* Guia padrão */}
            {!showInvalidWarning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="bg-black bg-opacity-50 px-2 py-0.5 rounded-full flex items-center">
                  <FaBolt className="text-yellow-400 mr-1" size={12} />
                  <p className="text-white text-xs">
                    Aproxime o código
                  </p>
                </div>
              </div>
            )}
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
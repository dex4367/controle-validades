import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { FaTimes, FaCamera } from 'react-icons/fa';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Configurações otimizadas para o leitor de código de barras
    const hints = new Map();
    // Foco apenas nos formatos mais comuns para melhorar a velocidade
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
    ]);
    
    // Desativar TRY_HARDER para scan mais rápido
    hints.set(DecodeHintType.TRY_HARDER, false);
    
    // Configurar para ser mais tolerante a erros (mais rápido)
    hints.set(DecodeHintType.PURE_BARCODE, true);
    
    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;

    const scanBarcode = async () => {
      if (stopScanning || !webcamRef.current || !isCameraReady) return;

      try {
        // Captura imagem com resolução reduzida para processamento mais rápido
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          // Usar createImageBitmap para processamento mais rápido quando disponível
          if (typeof createImageBitmap !== 'undefined') {
            try {
              const imageBlob = await fetch(imageSrc).then(res => res.blob());
              const imageBitmap = await createImageBitmap(imageBlob);
              
              // Criar canvas temporário
              const canvas = document.createElement('canvas');
              canvas.width = imageBitmap.width;
              canvas.height = imageBitmap.height;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Desenhar imagem no canvas
                ctx.drawImage(imageBitmap, 0, 0);
                
                // Converter para URL de dados para usar com o decodificador
                const dataUrl = canvas.toDataURL('image/jpeg');
                
                try {
                  // Tentar decodificar a partir da URL de dados
                  const img = new Image();
                  img.src = dataUrl;
                  
                  // Processar imagem quando estiver carregada
                  img.onload = async () => {
                    try {
                      const result = await codeReader.decodeFromImage(img);
                      if (result && result.getText()) {
                        onBarcodeDetected(result.getText());
                        stopScanning = true;
                      }
                    } catch (e) {
                      // Ignorar erros de decodificação
                    }
                  };
                } catch (e) {
                  // Ignorar erros de decodificação
                }
              }
            } catch (e) {
              // Fallback para método antigo se createImageBitmap falhar
              processWithImage(imageSrc);
            }
          } else {
            // Fallback para navegadores que não suportam createImageBitmap
            processWithImage(imageSrc);
          }
        }
        
        // Continuar o loop de escaneamento com requestAnimationFrame para melhor desempenho
        if (!stopScanning) {
          requestAnimationFrame(scanBarcode);
        }
      } catch (error) {
        console.error('Erro ao escanear código de barras:', error);
        requestAnimationFrame(scanBarcode);
      }
    };

    const processWithImage = async (imageSrc: string) => {
      try {
        const image = new Image();
        image.src = imageSrc;
        
        // Usar evento onload em vez de promise para melhor desempenho
        image.onload = async () => {
          try {
            const result = await codeReader.decodeFromImage(image);
            if (result && result.getText()) {
              onBarcodeDetected(result.getText());
              stopScanning = true;
            }
          } catch (e) {
            // Ignorar erros de decodificação
          }
        };
      } catch (e) {
        // Ignorar erros
      }
    };

    if (isCameraReady) {
      // Iniciar escaneamento imediatamente
      scanBarcode();
      
      // Também configurar um intervalo para garantir execução frequente
      scanIntervalRef.current = window.setInterval(() => {
        if (!stopScanning) {
          scanBarcode();
        }
      }, 200); // Tentar escanear a cada 200ms mesmo se o requestAnimationFrame falhar
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
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-3 bg-blue-600 text-white">
          <h3 className="text-base font-medium">Scanner de Código</h3>
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
              screenshotQuality={0.7} // Reduzir qualidade para processamento mais rápido
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                aspectRatio: 4/3,
                frameRate: { ideal: 30, min: 15 },
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full h-56 object-cover"
              mirrored={false}
            />
            
            {/* Área de foco para o código de barras */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-3/4 h-16">
                {/* Bordas cantos */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-500"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-500"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500"></div>
                
                {/* Linha de escaneamento animada */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="h-0.5 bg-green-500 w-full absolute top-1/2 animate-scan-line"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="p-3 bg-gray-50">
          <p className="text-xs text-center text-gray-600 mb-2">
            Posicione o código de barras na área verde
          </p>
          <div className="flex justify-center">
            <button 
              onClick={onClose}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
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
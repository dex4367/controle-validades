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

  useEffect(() => {
    // Configurações para o leitor de código de barras
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE,
    ]);
    
    // Configurar para maior precisão
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints);
    let stopScanning = false;

    const scanBarcode = async () => {
      if (stopScanning || !webcamRef.current || !isCameraReady) return;

      try {
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          try {
            // Criar uma imagem a partir do screenshot
            const image = new Image();
            image.src = imageSrc;
            
            // Aguardar até que a imagem carregue
            await new Promise((resolve) => {
              image.onload = resolve;
            });
            
            // Tentar decodificar o código de barras a partir da imagem
            const result = await codeReader.decodeFromImage(image);
            
            if (result && result.getText()) {
              onBarcodeDetected(result.getText());
              stopScanning = true;
              return;
            }
          } catch (error) {
            // Ignorar erros de decodificação e continuar escaneando
          }
        }
        
        // Continuar o loop de escaneamento
        if (!stopScanning) {
          requestAnimationFrame(scanBarcode);
        }
      } catch (error) {
        console.error('Erro ao escanear código de barras:', error);
        requestAnimationFrame(scanBarcode);
      }
    };

    if (isCameraReady) {
      scanBarcode();
    }

    return () => {
      stopScanning = true;
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
              videoConstraints={{
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                aspectRatio: 4/3,
                // Aumentar a qualidade e o framerate
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

        {/* Instruções e botões */}
        <div className="p-3 bg-gray-50">
          <p className="text-xs text-center text-gray-600 mb-2">
            Posicione o código de barras dentro da área verde
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
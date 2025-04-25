import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onBarcodeDetected, onClose }: BarcodeScannerProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configurações para o leitor de código de barras
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
    ]);

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
      <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Escanear Código de Barras</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <div className="relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className="w-full rounded"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-red-500 w-64 h-32 opacity-70"></div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-600">
          Posicione o código de barras dentro da área demarcada
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, Result, BarcodeFormat } from '@zxing/library';
import { IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  onBarcodeDetected?: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeDetected }) => {
  const [barcode, setBarcode] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  // Inicializar o scanner quando o componente montar
  useEffect(() => {
    // Criar uma instância do leitor de código de barras
    const reader = new BrowserMultiFormatReader();
    
    // Configurar os formatos de código de barras suportados
    const formats = new Map();
    formats.set(2, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128
    ]);
    reader.hints = formats;
    
    // Guardar referência para limpeza posterior
    readerRef.current = reader;
    
    // Iniciar o scanner automaticamente
    startScanner();
    
    // Limpar recursos quando o componente desmontar
    return () => {
      stopScanner();
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Função para iniciar o scanner
  const startScanner = async () => {
    if (!readerRef.current || !videoRef.current) return;
    
    try {
      setScanning(true);
      setError(null);
      
      // Configuração da câmera com preferência para câmera traseira em dispositivos móveis
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      // Iniciar o scanner com as restrições
      readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result: Result | null, error: Error | undefined) => {
          if (result) {
            // Código de barras detectado
            const scannedBarcode = result.getText();
            console.log('Código detectado:', scannedBarcode);
            setBarcode(scannedBarcode);
            
            // Notificar o componente pai se o callback existir
            if (onBarcodeDetected) {
              onBarcodeDetected(scannedBarcode);
            }
            
            // Parar o scanner após o primeiro código ser lido
            stopScanner();
          }
          
          if (error && !(error instanceof TypeError)) {
            console.error('Erro durante a leitura:', error);
          }
        }
      );
    } catch (err) {
      console.error('Erro ao iniciar o scanner:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setScanning(false);
    }
  };

  // Função para parar o scanner
  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
  };

  // Função para reiniciar o scanner
  const resetScanner = () => {
    setBarcode('');
    startScanner();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg mb-4">
        {/* Área do vídeo */}
        <div className="relative aspect-[4/3] w-full">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline={true}
            muted={true}
          />
          
          {/* Overlay para ajudar a posicionar o código de barras */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-blue-500 rounded-lg animate-pulse" />
            </div>
          )}
        </div>
      </div>
      
      {/* Mensagem de erro */}
      {error && (
        <div className="w-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Exibir código de barras lido */}
      {barcode && (
        <div className="w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Código lido:</p>
          <p className="text-lg font-mono">{barcode}</p>
        </div>
      )}
      
      {/* Botões de controle */}
      <div className="flex gap-2 w-full">
        <button
          onClick={stopScanner}
          disabled={!scanning}
          className={`flex-1 py-2 px-4 rounded-lg ${scanning 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          Parar
        </button>
        
        <button
          onClick={resetScanner}
          disabled={scanning && !barcode}
          className={`flex-1 py-2 px-4 rounded-lg ${!scanning || barcode
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          {barcode ? 'Escanear Novamente' : 'Iniciar Scanner'}
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
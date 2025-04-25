import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, Result, BarcodeFormat, DecodeHintType } from '@zxing/library';
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
    // Criar uma instância do leitor de código de barras com configurações otimizadas
    const hints = new Map();
    
    // Configurar todos os formatos relevantes de código de barras
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_93,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE
    ]);
    
    // Tentar várias vezes antes de falhar
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    // Tolerância para códigos danificados
    hints.set(DecodeHintType.PURE_BARCODE, false);
    
    const reader = new BrowserMultiFormatReader(hints);
    
    // Guardar referência para limpeza posterior
    readerRef.current = reader;
    
    // Iniciar o scanner automaticamente após um breve atraso para permitir carregamento
    setTimeout(() => {
      startScanner();
    }, 1000);
    
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
      // e configurações otimizadas para melhorar a leitura
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
          aspectRatio: { ideal: 4/3 } // 4:3
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
            
            // Reproduzir som de bipe quando detectar um código
            const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
            beep.volume = 0.3;
            try {
              beep.play();
            } catch (e) {
              console.log('Não foi possível reproduzir o som de bipe');
            }
            
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
      <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-4">
        {/* Área do vídeo */}
        <div className="relative aspect-[4/3] w-full">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline={true}
            muted={true}
            autoPlay={true}
          />
          
          {/* Overlay para ajudar a posicionar o código de barras */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Moldura do scanner com efeitos visuais de scanner profissional */}
              <div className="relative w-[90%] h-24 border-2 border-[#009A3D] rounded-lg">
                {/* Cantos da moldura para dar efeito de scanner */}
                <div className="absolute w-8 h-8 top-0 left-0 border-t-4 border-l-4 border-[#009A3D] rounded-tl"></div>
                <div className="absolute w-8 h-8 top-0 right-0 border-t-4 border-r-4 border-[#009A3D] rounded-tr"></div>
                <div className="absolute w-8 h-8 bottom-0 left-0 border-b-4 border-l-4 border-[#009A3D] rounded-bl"></div>
                <div className="absolute w-8 h-8 bottom-0 right-0 border-b-4 border-r-4 border-[#009A3D] rounded-br"></div>
                
                {/* Linha de escaneamento animada */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#009A3D] opacity-80 animate-scan"></div>
                
                {/* Mensagem de ajuda */}
                <div className="absolute -bottom-10 left-0 right-0 text-center">
                  <span className="bg-black/70 text-white px-4 py-2 rounded-full text-sm inline-block">
                    Posicione o código de barras dentro do retângulo
                  </span>
                </div>
              </div>
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
            ? 'bg-[#009A3D] text-white hover:bg-[#008A35]' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          {barcode ? 'Escanear Novamente' : 'Iniciar Scanner'}
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
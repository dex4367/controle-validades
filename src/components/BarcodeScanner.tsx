import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
}

const BarcodeScanner = ({ onBarcodeDetected }: BarcodeScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerActive = useRef<boolean>(false);
  
  // Inicializar o scanner quando o componente montar
  useEffect(() => {
    console.log('🚀 Inicializando scanner...');
    
    // Configurar o leitor de código de barras com configurações básicas
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128
    ]);
    
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const reader = new BrowserMultiFormatReader(hints, 150); // Timeout curto para detectar rapidamente
    readerRef.current = reader;
    
    // Iniciar o scanner com um pequeno atraso
    setTimeout(() => {
      startScanner();
    }, 500);
    
    // Limpar recursos
    return () => {
      console.log('Limpando recursos do scanner');
      scannerActive.current = false;
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);
  
  // Iniciar o scanner
  const startScanner = async () => {
    if (!readerRef.current || !videoRef.current) return;
    
    try {
      console.log('📷 Iniciando câmera...');
      setScanning(true);
      setError(null);
      scannerActive.current = true;
      
      // Configurações de vídeo simplificadas
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: 640,
          height: 480
        }
      };
      
      // Monitoramento contínuo de código de barras
      const handleDecoding = async () => {
        if (!scannerActive.current || !readerRef.current || !videoRef.current) return;
        
        try {
          // Tentar detectar um código uma vez
          const result = await readerRef.current.decodeFromVideoElement(videoRef.current);
          
          if (result) {
            const scannedCode = result.getText();
            console.log('✅ Código detectado:', scannedCode);
            
            // Reproduzir som de beep
            try {
              const beep = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
              beep.volume = 0.5;
              beep.play();
            } catch (e) {
              console.log('Erro ao reproduzir beep');
            }
            
            // Notificar o código detectado
            setLastDetection(scannedCode);
            onBarcodeDetected(scannedCode);
            
            // Parar o scanner após o primeiro código ser lido
            stopScanner();
            return;
          }
        } catch (error) {
          // Ignorar erros de detecção - é normal ocorrerem quando não há código visível
          if (scannerActive.current) {
            // Continuar tentando se o scanner ainda estiver ativo
            setTimeout(handleDecoding, 100);
          }
        }
        
        // Continuar o loop de detecção
        if (scannerActive.current) {
          setTimeout(handleDecoding, 100);
        }
      };
      
      // Iniciar o fluxo de vídeo antes de começar a decodificação
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      
      // Garantir que o vídeo esteja funcionando antes de começar a detectar
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play();
          console.log('▶️ Vídeo iniciado, começando detecção...');
          // Iniciar o loop de detecção
          handleDecoding();
        }
      };
      
    } catch (err) {
      console.error('❌ Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setScanning(false);
      scannerActive.current = false;
    }
  };
  
  // Parar o scanner
  const stopScanner = () => {
    console.log('⏹️ Parando scanner');
    scannerActive.current = false;
    setScanning(false);
    
    // Parar a stream de vídeo
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Reiniciar o scanner
  const resetScanner = () => {
    setLastDetection(null);
    startScanner();
  };
  
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Área do vídeo */}
      <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-4">
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
              {/* Moldura do scanner retangular */}
              <div className="relative w-[90%] h-24 border-2 border-[#009A3D] rounded-lg">
                {/* Cantos para destaque */}
                <div className="absolute w-8 h-8 top-0 left-0 border-t-4 border-l-4 border-[#009A3D] rounded-tl"></div>
                <div className="absolute w-8 h-8 top-0 right-0 border-t-4 border-r-4 border-[#009A3D] rounded-tr"></div>
                <div className="absolute w-8 h-8 bottom-0 left-0 border-b-4 border-l-4 border-[#009A3D] rounded-bl"></div>
                <div className="absolute w-8 h-8 bottom-0 right-0 border-b-4 border-r-4 border-[#009A3D] rounded-br"></div>
                
                {/* Linha de escaneamento animada */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#009A3D] opacity-80 animate-scan"></div>
                
                {/* Mensagem de ajuda */}
                <div className="absolute -bottom-10 left-0 right-0 text-center">
                  <span className="bg-black/70 text-white px-4 py-2 rounded-full text-sm inline-block">
                    Posicione o código de barras aqui
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
          <button 
            onClick={resetScanner}
            className="mt-2 bg-red-500 text-white py-1 px-3 rounded text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )}
      
      {/* Status do scanner */}
      {scanning && !error && !lastDetection && (
        <div className="w-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="flex items-center justify-center">
            <span className="inline-block w-4 h-4 mr-2 bg-blue-600 rounded-full animate-pulse"></span>
            Scanner ativo, aproxime o código de barras
          </p>
        </div>
      )}
      
      {/* Exibir código lido */}
      {lastDetection && (
        <div className="w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Código lido:</p>
          <p className="text-lg font-mono">{lastDetection}</p>
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
          disabled={scanning && !lastDetection}
          className={`flex-1 py-2 px-4 rounded-lg ${!scanning || lastDetection
            ? 'bg-[#009A3D] text-white hover:bg-[#008A35]' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          {lastDetection ? 'Escanear Novamente' : 'Iniciar Scanner'}
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
}

const BarcodeScanner = ({ onBarcodeDetected }: BarcodeScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configurar e iniciar o scanner quando o componente montar
  useEffect(() => {
    startScanning();
    
    // Limpar recursos quando o componente desmontar
    return () => {
      stopScanning();
    };
  }, []);
  
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);
      
      // Obter acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      // Armazenar a stream para poder limpar depois
      streamRef.current = stream;
      
      // Conectar o stream de vídeo ao elemento <video>
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Criar um leitor de código de barras com configurações básicas
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      const reader = new BrowserMultiFormatReader(hints);
      
      // Iniciar verificação periódica para detecção de código de barras
      scanIntervalRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            // Tentar decodificar código de barras do frame atual
            reader.decodeFromVideoElement(videoRef.current)
              .then(result => {
                if (result) {
                  const code = result.getText();
                  console.log("✅ Código detectado:", code);
                  
                  // Evitar detecções repetidas do mesmo código
                  if (code !== detectedCode) {
                    setDetectedCode(code);
                    
                    // Reproduzir som de beep
                    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Erro ao reproduzir som'));
                    
                    // Chamar a função de callback ANTES de parar o scanner
                    console.log("🔄 Enviando código para componente pai:", code);
                    onBarcodeDetected(code);
                    
                    // Pequeno delay para garantir que a UI seja atualizada antes de parar o scanner
                    setTimeout(() => {
                      // Parar o scanner após detectar o código
                      stopScanning();
                    }, 300);
                  }
                }
              })
              .catch(err => {
                // Ignorar erros de decodificação - é normal quando não há código visível
              });
          } catch (error) {
            // Ignorar erros temporários durante a detecção
          }
        }
      }, 200); // Verificar a cada 200ms
      
    } catch (err) {
      console.error("❌ Erro ao acessar câmera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setScanning(false);
    }
  };
  
  const stopScanning = () => {
    setScanning(false);
    
    // Limpar o intervalo de verificação
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Parar a stream da câmera
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Limpar o video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
  
  const resetScanner = () => {
    setDetectedCode(null);
    startScanning();
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
      {scanning && !error && !detectedCode && (
        <div className="w-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="flex items-center justify-center">
            <span className="inline-block w-4 h-4 mr-2 bg-blue-600 rounded-full animate-pulse"></span>
            Scanner ativo, aproxime o código de barras
          </p>
        </div>
      )}
      
      {/* Exibir código lido */}
      {detectedCode && (
        <div className="w-full bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-semibold">Código lido:</p>
          <p className="text-lg font-mono">{detectedCode}</p>
        </div>
      )}
      
      {/* Botões de controle */}
      <div className="flex gap-2 w-full">
        <button
          onClick={stopScanning}
          disabled={!scanning}
          className={`flex-1 py-2 px-4 rounded-lg ${scanning 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          Parar
        </button>
        
        <button
          onClick={resetScanner}
          disabled={scanning && !detectedCode}
          className={`flex-1 py-2 px-4 rounded-lg ${!scanning || detectedCode
            ? 'bg-[#009A3D] text-white hover:bg-[#008A35]' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          {detectedCode ? 'Escanear Novamente' : 'Iniciar Scanner'}
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner; 
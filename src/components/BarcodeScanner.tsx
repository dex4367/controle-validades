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
  const [scanAttempts, setScanAttempts] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar o scanner quando o componente montar
  useEffect(() => {
    console.log('Inicializando scanner...');
    
    // Criar uma instância do leitor de código de barras com configurações otimizadas
    const hints = new Map();
    
    // Priorizar formatos de código de barras comuns em produtos - EAN/UPC são os mais comuns
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, // Formato mais comum em produtos comerciais
      BarcodeFormat.UPC_A,  // Comum em produtos dos EUA
      BarcodeFormat.EAN_8,  // Versão curta do EAN para produtos pequenos
      BarcodeFormat.UPC_E,  // Versão curta do UPC 
      BarcodeFormat.CODE_128, // Formato industrial comum
      BarcodeFormat.CODE_39, // Formato industrial mais antigo
      BarcodeFormat.CODE_93,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.QR_CODE
    ]);
    
    // Configurações para aumentar a sensibilidade
    hints.set(DecodeHintType.TRY_HARDER, true); // Máximo esforço para decodificar
    hints.set(DecodeHintType.ASSUME_GS1, true); // Assume formato GS1 para melhor detecção
    hints.set(DecodeHintType.PURE_BARCODE, false); // Desativa modo de código puro para mais tolerância
    
    const reader = new BrowserMultiFormatReader(hints, 500); // 500ms de tempo para timeout de decodificação
    
    // Guardar referência para limpeza posterior
    readerRef.current = reader;
    
    // Iniciar o scanner automaticamente após um breve atraso para permitir carregamento
    const timer = setTimeout(() => {
      console.log('Iniciando scanner após delay...');
      startScanner();
    }, 1000);
    
    // Limpar recursos quando o componente desmontar
    return () => {
      console.log('Limpando recursos do scanner...');
      clearTimeout(timer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopScanner();
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Função para iniciar o scanner
  const startScanner = async () => {
    if (!readerRef.current || !videoRef.current) {
      console.error('Referências não disponíveis para iniciar scanner');
      return;
    }
    
    try {
      console.log('Iniciando scanner e solicitando acesso à câmera...');
      setScanning(true);
      setError(null);
      setScanAttempts(0);
      
      // Configuração da câmera com preferência para câmera traseira em dispositivos móveis
      // Resolução média para melhor performance/capacidade de detecção
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
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
            console.log('🎉 Código detectado:', scannedBarcode);
            setBarcode(scannedBarcode);
            
            // Reproduzir som de bipe quando detectar um código
            try {
              // Som de beep em base64 diretamente no código
              const beepSound = 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAAeTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGIf8KhAAAAAAAAAAAAAAAAAAAA//vQxAADwAABpAAAACAAADSAAAAEaXBob25lIHNvdW5kIGNyZWF0ZWQgYnkgQ2FybG9zIFZpbGxhbHZhIEF2aWxhIChjLXZpLWEpIENhcmxvcyBWaWxsYWx2YSBBdmlsYSAoYy12aS1hKSBNZXhpY28gQ2l0eQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/++DEAAAEeAFj9AAAIgRAq08wkIC8jJMUMiYkI0nkFOdVZGkhIUMvcURnCQjGuhQWCB4xjGMYxjVnilOc5zH1t/q4AI//qSJ3/1JAAAATqSJ3/9SQAAApB////UAAAAE6kif/9SQAAAASTEPS7pAAAANKWtLumIQAAbWkBRw8DwPGLo46hYHgeBrHUAPB8HwNE6ITKMA0DOZ8yGH/vDQDCJ4PuY44UH/lRUH4BRP5UUPC9BvQ//hojQGwQn8uIWDYQqP6lA///nrmgwbD/4ak6AwH/Kiq3/////kHwfA1jqsAYDoPg+BonRCZRgGgZzPmQw/94aAYRPB9zHHCg/8qKg/AKJ/KigIIPQf0P/8NEaA2H/LS///+VFQfh/4aI0BsEJ/LiFg2EKj//9+D4Gf//KioAKwWC/yoqACoIIn+VFQ///KioP6qKg///BSf5UVD///BCf5aSACoP6qi///woqD+Sgif///oA=';
              
              const beep = new Audio(beepSound);
              beep.volume = 0.5;
              beep.play();
            } catch (e) {
              console.log('Não foi possível reproduzir o som de bipe', e);
            }
            
            // Notificar o componente pai se o callback existir
            if (onBarcodeDetected) {
              onBarcodeDetected(scannedBarcode);
            }
            
            // Parar o scanner após o primeiro código ser lido
            stopScanner();
          }
          
          if (error && !(error instanceof TypeError)) {
            // Incrementar contagem de tentativas para reiniciar o scanner se necessário
            setScanAttempts(prev => prev + 1);
            console.log('Tentativa de scan:', scanAttempts);
            
            // Logging detalhado do erro
            console.warn('Erro durante a leitura:', error.name, error.message);
          }
        }
      );
      
      // Configurar reinicialização periódica do scanner se não detectar códigos por um tempo
      intervalRef.current = setInterval(() => {
        if (scanning && scanAttempts > 30) { // Aprox. 15 segundos sem detecção
          console.log('Reiniciando scanner devido a falta de detecção...');
          if (readerRef.current) {
            readerRef.current.reset();
            setScanAttempts(0);
            startScanner(); // Reiniciar o scanner
          }
        }
      }, 500);
    } catch (err) {
      console.error('Erro ao iniciar o scanner:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setScanning(false);
    }
  };

  // Função para parar o scanner
  const stopScanner = () => {
    console.log('Parando scanner...');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
  };

  // Função para reiniciar o scanner
  const resetScanner = () => {
    console.log('Reiniciando scanner...');
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
          <button 
            onClick={resetScanner}
            className="mt-2 bg-red-500 text-white py-1 px-3 rounded text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )}
      
      {/* Status do scanner */}
      {scanning && !error && !barcode && (
        <div className="w-full bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <p className="flex items-center justify-center">
            <span className="inline-block w-4 h-4 mr-2 bg-blue-600 rounded-full animate-pulse"></span>
            Scanner ativo, aproxime o código de barras
          </p>
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
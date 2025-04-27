import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/CameraBarcodeScanner.css';
import { FaCamera, FaStop, FaArrowLeft } from 'react-icons/fa';

// Definindo os tipos para o Quagga
// @ts-ignore
declare module '@ericblade/quagga2';

interface CameraBarcodeScannerProps {
  onDetect: (barcode: string) => void;
}

const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({ onDetect }) => {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  
  // Armazenar resultados recentes para evitar falsos positivos
  const lastResultsRef = useRef<string[]>([]);
  const lastDetectionTime = useRef<number>(0);

  // Estilos inline para garantir que sejam aplicados
  const headerStyle = {
    backgroundColor: '#008000', // Verde
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  const scanLineStyle = {
    position: 'absolute' as 'absolute',
    top: '30%',
    left: '10%',
    width: '80%',
    height: '3px',
    backgroundColor: '#e30613',
    boxShadow: '0 0 8px 2px rgba(227, 6, 19, 0.8)',
    zIndex: 15,
    animation: 'scanAnimation 3s linear infinite'
  };

  // Validação de código EAN/UPC usando algoritmo de checksum (dígito verificador)
  const isValidBarcode = (code: string): boolean => {
    // Verificar se o código tem um comprimento razoável
    if (!code || code.length < 8 || code.length > 13) return false;
    
    // Verificar se contém apenas dígitos
    if (!/^\d+$/.test(code)) return false;
    
    // Para códigos EAN/UPC, validar usando o dígito verificador
    if (code.length === 8 || code.length === 13) {
      const digits = code.split('').map(Number);
      const checkDigit = digits.pop()!;
      
      let sum = 0;
      digits.forEach((digit, index) => {
        // Para EAN-13 e UPC, posições pares têm peso 3, ímpares têm peso 1
        const weight = (code.length === 13 ? index % 2 === 0 : index % 2 === 1) ? 1 : 3;
        sum += digit * weight;
      });
      
      const calculatedCheckDigit = (10 - (sum % 10)) % 10;
      return checkDigit === calculatedCheckDigit;
    }
    
    // Para outros formatos, apenas aceitar se parecer razoável
    return true;
  };

  // Verificar se um código apareceu com frequência suficiente para considerá-lo válido
  const isConfidentResult = (code: string): boolean => {
    // Adicionar ao histórico de resultados
    lastResultsRef.current.push(code);
    
    // Manter apenas os últimos 10 resultados
    if (lastResultsRef.current.length > 10) {
      lastResultsRef.current.shift();
    }
    
    // Contar quantas vezes o código apareceu nos últimos resultados
    const count = lastResultsRef.current.filter(result => result === code).length;
    
    // Considerar válido se aparecer pelo menos 3 vezes nos últimos 10 resultados
    return count >= 3;
  };

  const startScanner = async () => {
    setError(null);
    setBarcode(null);
    setScanning(true);
    lastResultsRef.current = [];

    try {
      // Carregamento dinâmico do Quagga para reduzir o tamanho do bundle inicial
      const Quagga = (await import('@ericblade/quagga2')).default;

      if (viewfinderRef.current) {
        // Configuração inicial do Quagga com parâmetros otimizados
        await Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: viewfinderRef.current,
            constraints: {
              facingMode: 'environment', // Usar a câmera traseira
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              aspectRatio: { min: 1, max: 2 }
              // Propriedades avançadas removidas por incompatibilidade
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: true,
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 20, // Aumentar frequência para mais tentativas de leitura por segundo
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'code_128_reader',
              'code_39_reader',
              'code_93_reader',
              'upc_reader',
              'upc_e_reader'
            ],
            multiple: false
            // Configurações de debug removidas para evitar erros
          },
          locate: true
        });

        Quagga.start();

        Quagga.onDetected((result: any) => {
          if (result.codeResult) {
            const code = result.codeResult.code;
            
            // Ignorar detecções muito próximas no tempo (evitar duplicações)
            const now = Date.now();
            if (now - lastDetectionTime.current < 300) {
              return;
            }
            
            // Validar o código de barras
            if (isValidBarcode(code) && isConfidentResult(code)) {
              setBarcode(code);
              lastDetectionTime.current = now;
              onDetect(code);
              Quagga.stop();
              setScanning(false);
            }
          }
        });

        // Desenhar os boxes de detecção
        Quagga.onProcessed((result: any) => {
          const drawingCtx = Quagga.canvas.ctx.overlay;
          const drawingCanvas = Quagga.canvas.dom.overlay;

          if (result) {
            if (result.boxes) {
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
              
              // Desenha todos os boxes (em rosa claro semitransparente)
              result.boxes.forEach((box: any) => {
                if (box !== result.box) {
                  drawingCtx.beginPath();
                  drawingCtx.lineWidth = 2;
                  drawingCtx.strokeStyle = "rgba(255, 0, 127, 0.5)";
                  drawingCtx.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
                  drawingCtx.stroke();
                }
              });
            }

            // Se encontrou um código, destaca o box em verde
            if (result.box) {
              drawingCtx.beginPath();
              drawingCtx.lineWidth = 4;
              drawingCtx.strokeStyle = "#00e500";
              drawingCtx.rect(
                result.box.x, 
                result.box.y, 
                result.box.width, 
                result.box.height
              );
              drawingCtx.stroke();
            }

            // Se tiver resultados de linha, desenha em azul
            if (result.codeResult && result.codeResult.code) {
              drawingCtx.font = "24px Arial";
              drawingCtx.fillStyle = "#00e500";
              drawingCtx.fillText(
                result.codeResult.code, 
                10, 
                drawingCanvas.height - 10
              );
              
              // Avaliar a qualidade da leitura
              if (result.codeResult.format && result.codeResult.code) {
                const code = result.codeResult.code;
                // Se o código parece válido, adiciona ao histórico para validação
                if (isValidBarcode(code)) {
                  lastResultsRef.current.push(code);
                  if (lastResultsRef.current.length > 10) {
                    lastResultsRef.current.shift();
                  }
                }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error("Erro ao iniciar o scanner:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      const Quagga = (await import('@ericblade/quagga2')).default;
      Quagga.stop();
      setScanning(false);
    } catch (err) {
      console.error("Erro ao parar o scanner:", err);
    }
  };

  useEffect(() => {
    // Iniciar scanner automaticamente quando o componente for montado
    startScanner();
    
    return () => {
      // Função de limpeza quando o componente é desmontado
      stopScanner();
    };
  }, []);

  const goBack = () => {
    // Em vez de navegar, simplesmente fechar o scanner
    // navigate(-1);
    stopScanner();
    onDetect(""); // Emitir um código vazio para sinalizar que o usuário cancelou
  };

  return (
    <div className="camera-scanner-container">
      <div style={headerStyle}>
        <button className="back-button" onClick={goBack}>
          <FaArrowLeft className="mr-2" /> Voltar
        </button>
        <h2>Scanner de Código de Barras</h2>
      </div>

      <div className="scanner-content">
        {!scanning ? (
          <div className="scanner-instructions">
            <p>Aguarde, acessando a câmera...</p>
          </div>
        ) : (
          <div className="scanner-active">
            <div className="viewfinder-container">
              <div className="scanner-viewfinder" ref={viewfinderRef}></div>
              <canvas ref={canvasRef} className="scanner-canvas"></canvas>
              
              {/* Retângulo de enquadramento com cantos destacados */}
              <div className="scan-frame">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
              </div>
              
              {/* Linha de escaneamento com estilo inline para garantir que funcione */}
              <div style={scanLineStyle}></div>
              
              {/* Mensagem de orientação durante o escaneamento */}
              <div className="scanning-message">
                Posicione o código de barras no centro do quadro
              </div>
            </div>
            
            <div className="scanner-controls">
              <button className="stop-button" onClick={stopScanner}>
                <FaStop className="mr-2" /> Parar Scanner
              </button>
            </div>
          </div>
        )}

        {barcode && (
          <div className="result-container">
            <h3>Código Detectado</h3>
            <div className="barcode-result">{barcode}</div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>

      {/* Estilo para a animação da linha */}
      <style>{`
        @keyframes scanAnimation {
          0% { top: 20%; }
          50% { top: 80%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  );
};

export default CameraBarcodeScanner; 
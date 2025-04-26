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

  const startScanner = async () => {
    setError(null);
    setBarcode(null);
    setScanning(true);

    try {
      // Carregamento dinâmico do Quagga para reduzir o tamanho do bundle inicial
      const Quagga = (await import('@ericblade/quagga2')).default;

      if (viewfinderRef.current) {
        // Configuração inicial do Quagga
        await Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: viewfinderRef.current,
            constraints: {
              facingMode: 'environment', // Usar a câmera traseira
              width: { min: 640 },
              height: { min: 480 },
              aspectRatio: { min: 1, max: 2 }
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 10,
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'code_39_reader', 'code_93_reader']
          },
          locate: true
        });

        Quagga.start();

        Quagga.onDetected((result: any) => {
          if (result.codeResult) {
            const code = result.codeResult.code;
            setBarcode(code);
            onDetect(code);
            Quagga.stop();
            setScanning(false);
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
            <p>Aponte a câmera para o código de barras do produto para escanear automaticamente.</p>
            <button 
              className="start-button" 
              onClick={startScanner}
              style={{backgroundColor: '#008000'}}
            >
              <FaCamera className="mr-2" /> Iniciar Scanner
            </button>
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
import React, { useState, useEffect } from 'react';
import { useZxing } from 'react-zxing';

const BarcodeScanner = ({ onScan, onError }) => {
  const [result, setResult] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [constraints, setConstraints] = useState({
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    }
  });

  // Configuração avançada para o leitor de código de barras
  const { ref } = useZxing({
    onDecodeResult(decodedResult) {
      const text = decodedResult.getText();
      setResult(text);
      onScan && onScan(text);
      // Pausa a câmera por um momento após um scan bem-sucedido
      setIsActive(false);
      setTimeout(() => setIsActive(true), 1500);
    },
    onError(error) {
      console.error("Erro de escaneamento:", error);
      onError && onError(error);
    },
    paused: !isActive,
    constraints: constraints,
    timeBetweenDecodingAttempts: 300,
    preferredCamera: 'environment',
    hints: {
      // Suporta apenas formatos de códigos de barras 1D
      TRY_HARDER: true,
      PURE_BARCODE: true,
      ASSUME_GS1: false,
      POSSIBLE_FORMATS: [
        'CODABAR',
        'CODE_39',
        'CODE_93',
        'CODE_128',
        'EAN_8',
        'EAN_13',
        'ITF',
        'RSS_14',
        'RSS_EXPANDED',
        'UPC_A',
        'UPC_E',
        'UPC_EAN_EXTENSION'
      ],
      // Permite reconhecimento em várias orientações
      TRY_INVERTED: true,
      CHARACTER_SET: 'UTF-8'
    }
  });

  // Alterna entre câmeras frontal e traseira
  const toggleCamera = () => {
    setConstraints({
      video: {
        facingMode: constraints.video.facingMode === 'environment' ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      }
    });
  };

  return (
    <div className="barcode-scanner-container">
      <div className="scanner-view">
        {isActive ? (
          <>
            <div className="viewfinder">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
              <div className="scan-line"></div>
            </div>
            <video ref={ref} className="camera-view" />
            <button className="camera-switch" onClick={toggleCamera}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="white" d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V16l-5-5 5-5v2.5h4v7h-4z"/>
              </svg>
            </button>
          </>
        ) : (
          <div className="scanner-success">
            <div className="success-message">
              <span>Código Escaneado!</span>
              <p>{result}</p>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .barcode-scanner-container {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }
        .scanner-view {
          position: relative;
          width: 100%;
          height: 300px;
          overflow: hidden;
          border-radius: 12px;
          background-color: #000;
        }
        .camera-view {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .viewfinder {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          pointer-events: none;
        }
        .corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: #ffffff;
          border-style: solid;
        }
        .top-left {
          top: 60px;
          left: 40px;
          border-width: 4px 0 0 4px;
          border-top-left-radius: 8px;
        }
        .top-right {
          top: 60px;
          right: 40px;
          border-width: 4px 4px 0 0;
          border-top-right-radius: 8px;
        }
        .bottom-left {
          bottom: 160px;
          left: 40px;
          border-width: 0 0 4px 4px;
          border-bottom-left-radius: 8px;
        }
        .bottom-right {
          bottom: 160px;
          right: 40px;
          border-width: 0 4px 4px 0;
          border-bottom-right-radius: 8px;
        }
        .scan-line {
          position: absolute;
          width: calc(100% - 80px);
          height: 2px;
          background-color: rgba(255, 0, 0, 0.8);
          left: 40px;
          top: 50%;
          transform: translateY(-50%);
          animation: scanAnimation 1.5s infinite ease-in-out;
          box-shadow: 0 0 8px rgba(255, 0, 0, 0.7);
        }
        @keyframes scanAnimation {
          0% {
            top: 65px;
          }
          50% {
            top: calc(100% - 165px);
          }
          100% {
            top: 65px;
          }
        }
        .scanner-success {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
        }
        .success-message {
          text-align: center;
          color: white;
          padding: 20px;
          border-radius: 8px;
          background-color: rgba(200, 0, 0, 0.3);
          width: 80%;
          max-width: 300px;
        }
        .success-message span {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
          display: block;
        }
        .success-message p {
          font-size: 18px;
          word-break: break-all;
          margin: 10px 0 0;
        }
        .camera-switch {
          position: absolute;
          bottom: 15px;
          right: 15px;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
        }
        .camera-switch:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner; 
import { useEffect, useRef, useState } from 'react'

const CameraTest = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraStatus, setCameraStatus] = useState('Clique em "Iniciar Câmera" para começar o teste')
  const [cameraStatusClass, setCameraStatusClass] = useState('')
  const [httpsStatus, setHttpsStatus] = useState('')
  const [httpsStatusClass, setHttpsStatusClass] = useState('')
  const [diagnostics, setDiagnostics] = useState<string[]>([])
  const [isStartButtonDisabled, setIsStartButtonDisabled] = useState(false)
  const [isStopButtonDisabled, setIsStopButtonDisabled] = useState(true)

  useEffect(() => {
    // Verificar HTTPS
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      setHttpsStatus('Conexão segura detectada. Bom!')
      setHttpsStatusClass('status success')
    } else {
      setHttpsStatus('Atenção: Você está usando HTTP. Muitos navegadores só permitem acesso à câmera em conexões seguras (HTTPS) ou localhost.')
      setHttpsStatusClass('status warning')
    }

    const newDiagnostics = [...diagnostics]
    
    // Verificar suporte à API de câmera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      newDiagnostics.push('⚠️ Seu navegador não suporta a API de câmera')
      setCameraStatus('Seu navegador não suporta acesso à câmera')
      setCameraStatusClass('status error')
      setIsStartButtonDisabled(true)
    } else {
      newDiagnostics.push('✓ Seu navegador suporta a API de câmera')
    }

    // Verificar tipo de dispositivo
    const userAgent = navigator.userAgent
    if (/android/i.test(userAgent)) {
      newDiagnostics.push('✓ Dispositivo Android detectado')
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      newDiagnostics.push('✓ Dispositivo iOS detectado')
      newDiagnostics.push('ℹ️ iOS pode ter limitações adicionais de acesso à câmera')
    } else {
      newDiagnostics.push('✓ Dispositivo desktop detectado')
    }

    // Verificar navegador
    if (/chrome/i.test(userAgent)) {
      newDiagnostics.push('✓ Navegador Chrome/Chromium detectado')
    } else if (/firefox/i.test(userAgent)) {
      newDiagnostics.push('✓ Navegador Firefox detectado')
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      newDiagnostics.push('✓ Navegador Safari detectado')
    } else if (/edge/i.test(userAgent)) {
      newDiagnostics.push('✓ Navegador Edge detectado')
    } else {
      newDiagnostics.push('⚠️ Navegador não identificado, pode haver limitações')
    }

    setDiagnostics(newDiagnostics)
  }, [])

  const startCamera = () => {
    setCameraStatus('Solicitando acesso à câmera...')
    setCameraStatusClass('status info')

    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then((mediaStream) => {
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        setCameraStatus('Câmera funcionando!')
        setCameraStatusClass('status success')
        setIsStartButtonDisabled(true)
        setIsStopButtonDisabled(false)

        const newDiagnostics = [...diagnostics]
        newDiagnostics.push('✓ Acesso à câmera concedido')

        const videoTrack = mediaStream.getVideoTracks()[0]
        newDiagnostics.push(`✓ Câmera ativa: ${videoTrack.label}`)

        const capabilities = videoTrack.getCapabilities?.()
        if (capabilities) {
          if (capabilities.hasOwnProperty('torch')) {
            newDiagnostics.push('✓ Sua câmera suporta flash')
          }
          if (capabilities.hasOwnProperty('focusMode') && (capabilities as any).focusMode?.includes('continuous')) {
            newDiagnostics.push('✓ Sua câmera suporta foco automático contínuo')
          }
        }

        setDiagnostics(newDiagnostics)
      })
      .catch((error) => {
        console.error('Erro ao acessar a câmera:', error)

        let errorMessage = 'Não foi possível acessar a câmera.'
        const newDiagnostics = [...diagnostics]

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Permissão para acessar a câmera foi negada.'
          newDiagnostics.push('⚠️ Permissão para a câmera negada')
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.'
          newDiagnostics.push('⚠️ Nenhuma câmera encontrada')
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'A câmera está sendo usada por outro aplicativo.'
          newDiagnostics.push('⚠️ Câmera já está em uso por outro aplicativo')
        } else {
          newDiagnostics.push(`⚠️ Erro ao acessar a câmera: ${error.name}`)
        }

        setCameraStatus(errorMessage)
        setCameraStatusClass('status error')
        setDiagnostics(newDiagnostics)
      })
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setStream(null)

      setCameraStatus('Câmera parada')
      setCameraStatusClass('status info')
      setIsStartButtonDisabled(false)
      setIsStopButtonDisabled(true)

      const newDiagnostics = [...diagnostics]
      newDiagnostics.push('✓ Câmera parada manualmente')
      setDiagnostics(newDiagnostics)
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
      <h1 style={{ color: '#333' }}>Teste de Acesso à Câmera</h1>
      
      <div className={httpsStatusClass} style={{ padding: '15px', margin: '15px 0', borderRadius: '4px', textAlign: 'center' }}>
        {httpsStatus}
      </div>
      
      <div className={cameraStatusClass} style={{ padding: '15px', margin: '15px 0', borderRadius: '4px', textAlign: 'center' }}>
        {cameraStatus}
      </div>
      
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          onClick={startCamera} 
          disabled={isStartButtonDisabled}
          style={{ 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            cursor: 'pointer', 
            borderRadius: '4px', 
            margin: '5px', 
            fontSize: '16px',
            opacity: isStartButtonDisabled ? 0.5 : 1
          }}
        >
          Iniciar Câmera
        </button>
        <button 
          onClick={stopCamera} 
          disabled={isStopButtonDisabled}
          style={{ 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            cursor: 'pointer', 
            borderRadius: '4px', 
            margin: '5px', 
            fontSize: '16px',
            opacity: isStopButtonDisabled ? 0.5 : 1
          }}
        >
          Parar Câmera
        </button>
      </div>
      
      <div style={{ width: '100%', maxWidth: '320px', height: '240px', margin: '20px auto', border: '1px solid #ccc', backgroundColor: '#f5f5f5', position: 'relative' }}>
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
      </div>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', margin: '15px 0', borderRadius: '4px' }}>
        <h2 style={{ color: '#333' }}>Informações de Diagnóstico:</h2>
        <ul>
          {diagnostics.map((item, index) => (
            <li key={index} style={{ color: item.includes('⚠️') ? '#c62828' : 'inherit', marginBottom: '5px' }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', margin: '15px 0', borderRadius: '4px' }}>
        <h2 style={{ color: '#333' }}>Como resolver problemas de câmera:</h2>
        <ol style={{ marginLeft: '20px' }}>
          <li style={{ marginBottom: '10px' }}>Certifique-se de estar usando uma conexão HTTPS ou localhost</li>
          <li style={{ marginBottom: '10px' }}>Verifique se você permitiu o acesso à câmera quando solicitado</li>
          <li style={{ marginBottom: '10px' }}>Clique no ícone de cadeado/câmera na barra de endereço para verificar as permissões</li>
          <li style={{ marginBottom: '10px' }}>Tente usar um navegador diferente (Chrome ou Firefox são recomendados)</li>
          <li style={{ marginBottom: '10px' }}>Em alguns dispositivos, pode ser necessário reiniciar o navegador</li>
        </ol>
      </div>
      
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          onClick={() => window.location.href = '/'}
          style={{ 
            backgroundColor: '#2196f3', 
            color: 'white', 
            border: 'none', 
            padding: '10px 15px', 
            cursor: 'pointer', 
            borderRadius: '4px', 
            margin: '5px', 
            fontSize: '16px' 
          }}
        >
          Voltar ao Scanner
        </button>
      </div>

      <style>{`
        .status.success {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .status.error {
          background-color: #ffebee;
          color: #c62828;
        }
        .status.warning {
          background-color: #fff3e0;
          color: #ef6c00;
        }
        .status.info {
          background-color: #e3f2fd;
          color: #1565c0;
        }
      `}</style>
    </div>
  )
}

export default CameraTest 
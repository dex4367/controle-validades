import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Componentes
import Dashboard from './pages/Dashboard'
import ProductList from './pages/ProductList'
import ProductForm from './pages/ProductForm'
import BarcodeScanner from './pages/BarcodeScanner'
import Reports from './pages/Reports'
import MobileReceive from './pages/MobileReceive'
import Layout from './components/Layout'
import CategoriesManager from './pages/CategoriesManager'

// Configuração do Supabase
const supabaseUrl = 'https://xlqxzgurlnxrnlprlrbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscXh6Z3VybG54cm5scHJscmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDQ4MjUsImV4cCI6MjA2MTAyMDgyNX0.OShVB-J-doJbBqna_0nxyb9w0vJebSWKjm1lAMOkJTE'
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Componente principal da aplicação
 */
function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [animatedLines, setAnimatedLines] = useState<number[]>([])

  // Efeito para garantir que a tela de carregamento seja mostrada por 3 segundos
  useEffect(() => {
    // Configurar o timer de 3 segundos para a tela de carregamento
    const loadingTimer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    // Verificação da conexão com o Supabase em paralelo
    const checkConnection = async () => {
      try {
        const { data } = await supabase.from('categories').select('*').limit(1)
        console.log('Supabase connection successful:', data)
      } catch (error) {
        console.error('Error connecting to Supabase:', error)
      }
    }

    checkConnection()

    // Cleanup function para limpar o timer se o componente for desmontado
    return () => clearTimeout(loadingTimer)
  }, [])

  // Efeito para animar progressivamente as linhas do código de barras
  useEffect(() => {
    if (isLoading) {
      const totalLines = 30
      const interval = setInterval(() => {
        setAnimatedLines(prev => {
          const nextIndex = prev.length
          if (nextIndex < totalLines) {
            return [...prev, nextIndex]
          }
          clearInterval(interval)
          return prev
        })
      }, 40)

      return () => clearInterval(interval)
    }
  }, [isLoading])

  // Tela de carregamento enquanto verifica a conexão
  if (isLoading) {
    // Gerar as barras do código de barras com larguras variadas
    const barcodeLines = []
    const totalLines = 30
    let leftPosition = 10

    for (let i = 0; i < totalLines; i++) {
      const width = Math.floor(Math.random() * 6) + 2 // Largura entre 2px e 8px
      const gap = Math.floor(Math.random() * 3) + 1 // Espaço entre 1px e 4px
      const isThick = Math.random() > 0.7 // 30% de chance de ser uma barra mais grossa
      const actualWidth = isThick ? width * 1.5 : width
      const darkness = isThick ? 1 : 0.8 // Barras grossas são mais escuras
      
      barcodeLines.push({
        id: i,
        width: actualWidth,
        left: leftPosition,
        delay: i * 0.04, // Delay crescente para cada barra
        isAnimated: animatedLines.includes(i),
        darkness
      })
      
      leftPosition += actualWidth + gap
    }

    return (
      <div className="flex items-center justify-center h-screen bg-brmania-light">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4 text-brmania-dark">Carregando...</h2>
          
          <div className="barcode-container h-20 mb-6 bg-gray-50 rounded relative">
            {/* Barras do código de barras */}
            {barcodeLines.map(line => (
              <div
                key={line.id}
                className={`barcode-line absolute h-full ${line.isAnimated ? 'animated' : ''}`}
                style={{
                  width: `${line.width}px`,
                  left: `${line.left}px`,
                  animationDelay: `${line.delay}s`,
                  backgroundColor: `rgba(31, 41, 55, ${line.darkness})` // Variação de cor baseada em darkness
                }}
              />
            ))}
            
            {/* Números abaixo do código de barras (opcional) */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1].map((digit, idx) => (
              <div 
                key={idx}
                className="barcode-digit"
                style={{
                  left: `${idx * 25 + 20}px`,
                  transitionDelay: `${idx * 0.1 + 0.8}s`
                }}
              >
                {digit}
              </div>
            ))}
          </div>
          
          <p className="text-gray-600">Conectando ao banco de dados</p>
        </div>
      </div>
    )
  }

  // Rotas da aplicação
  return (
    <Routes>
      {/* Rotas para a página mobile de recebimento de produtos */}
      <Route path="/mobile/receive" element={<MobileReceive />} />
      <Route path="/mobile-receive" element={<MobileReceive />} />
      
      {/* Rotas principais com Layout */}
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/products" element={<Layout><ProductList /></Layout>} />
      <Route path="/products/new" element={<Layout><ProductForm /></Layout>} />
      <Route path="/products/edit/:id" element={<Layout><ProductForm /></Layout>} />
      <Route path="/scanner" element={<Layout><BarcodeScanner /></Layout>} />
      <Route path="/reports" element={<Layout><Reports /></Layout>} />
      <Route path="/categories" element={<Layout><CategoriesManager /></Layout>} />
    </Routes>
  )
}

export default App 
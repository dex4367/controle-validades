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
      const totalLines = 12
      const interval = setInterval(() => {
        setAnimatedLines(prev => {
          const nextIndex = prev.length
          if (nextIndex < totalLines) {
            return [...prev, nextIndex]
          }
          clearInterval(interval)
          return prev
        })
      }, 80)

      return () => clearInterval(interval)
    }
  }, [isLoading])

  // Tela de carregamento enquanto verifica a conexão
  if (isLoading) {
    // Definir cores para as barras
    const barColors = [
      'var(--brmania-yellow)',
      '#ffdb5c',
      'var(--brmania-yellow)',
      '#ffdb5c',
      'var(--brmania-yellow)',
      '#ffdb5c',
      'var(--brmania-yellow)',
      '#ffdb5c',
      'var(--brmania-yellow)',
      '#ffdb5c',
      'var(--brmania-yellow)',
      '#ffdb5c',
    ]
    
    // Gerar as barras do código de barras com larguras variadas
    const barcodeLines = []
    const totalLines = 12
    let leftPosition = 0

    for (let i = 0; i < totalLines; i++) {
      const width = Math.floor(Math.random() * 6) + 5 // Largura entre 5px e 11px
      const gap = Math.floor(Math.random() * 4) + 6   // Espaço entre 6px e 10px
      const height = Math.floor(Math.random() * 15) + 85 // Altura entre 85% e 100%
      
      barcodeLines.push({
        id: i,
        width: width,
        left: leftPosition,
        delay: i * 0.15,  // Aumentar atraso para criar efeito de onda
        isAnimated: animatedLines.includes(i),
        color: barColors[i],
        height: `${height}%`,
      })
      
      leftPosition += width + gap
    }

    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-r from-white to-brmania-light">
        <div className="loading-container p-6 w-80">
          <div className="relative h-28 w-full mb-2">
            {/* Barras do código de barras */}
            {barcodeLines.map(line => (
              <div
                key={line.id}
                className={`barcode-line absolute ${line.isAnimated ? 'animated' : ''}`}
                style={{
                  width: `${line.width}px`,
                  left: `${line.left}px`,
                  height: line.height,
                  bottom: 0,
                  animationDelay: `${line.delay}s`,
                  backgroundColor: line.color,
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
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
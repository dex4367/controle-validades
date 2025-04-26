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

  // Tela de carregamento enquanto verifica a conexão
  if (isLoading) {
    // Configuração das barras de carregamento
    const bars = [
      { width: '6px', delay: '0s' },
      { width: '3px', delay: '0.2s' },
      { width: '8px', delay: '0.4s' },
      { width: '4px', delay: '0.6s' },
      { width: '5px', delay: '0.8s' },
      { width: '7px', delay: '1.0s' },
      { width: '4px', delay: '1.2s' },
      { width: '6px', delay: '1.4s' }
    ]

    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-60 h-12 loading-container">
          <div className="bar-container">
            {bars.map((bar, index) => (
              <div 
                key={index} 
                className="barcode-line loading-bar-animation"
                style={{
                  width: bar.width,
                  animationDelay: bar.delay,
                  animationDuration: '2s'
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
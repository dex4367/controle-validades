import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { FaSpinner } from 'react-icons/fa'

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

  // Verifica a conexão com o Supabase ao iniciar
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data } = await supabase.from('categories').select('*').limit(1)
        console.log('Supabase connection successful:', data)
      } catch (error) {
        console.error('Error connecting to Supabase:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkConnection()
  }, [])

  // Tela de carregamento enquanto verifica a conexão
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brmania-light">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <FaSpinner className="animate-spin text-brmania-green text-3xl mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-brmania-dark">Carregando...</h2>
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
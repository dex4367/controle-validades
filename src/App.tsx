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
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  // Verifica a conexão com o Supabase em segundo plano
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data } = await supabase.from('categories').select('*').limit(1)
        console.log('Supabase connection successful:', data)
        setConnectionError(false)
      } catch (error) {
        console.error('Error connecting to Supabase:', error)
        setConnectionError(true)
      } finally {
        setIsLoading(false)
      }
    }

    checkConnection()
  }, [])

  // Rotas da aplicação
  return (
    <>
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white p-3 rounded-md shadow-md z-50">
          <FaSpinner className="animate-spin text-brmania-green text-xl" />
        </div>
      )}
      
      {connectionError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 p-3 rounded-md shadow-md z-50">
          <p className="text-red-600 text-sm">Problema de conexão com o banco de dados</p>
        </div>
      )}
      
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
    </>
  )
}

export default App 
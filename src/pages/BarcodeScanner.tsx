import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsByBarcode } from '../services/supabase'
import CameraBarcodeScanner from './CameraBarcodeScanner'
import { Product } from '../services'

interface RiskInfo {
  level: string;
  color: string;
  textColor: string;
  badge: string;
}

const BarcodeScanner = () => {
  const navigate = useNavigate()
  
  // Estados
  const [barcode, setBarcode] = useState<string>('')
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusInput, setFocusInput] = useState(true)
  const [showCameraScanner, setShowCameraScanner] = useState(false)

  // Efeitos
  useEffect(() => {
    if (focusInput) {
      const inputElement = document.getElementById('barcode-input')
      if (inputElement) {
        inputElement.focus()
      }
    }
  }, [focusInput])

  // Funções auxiliares
  const calculateRisk = (expiryDateStr: string): RiskInfo => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiryDate = new Date(expiryDateStr)
    expiryDate.setHours(0, 0, 0, 0)
    
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return {
        level: 'Vencido',
        color: 'bg-red-100 border-red-300 text-red-800',
        textColor: 'text-red-800',
        badge: 'bg-red-500'
      }
    } else if (diffDays <= 7) {
      return {
        level: 'Alto Risco',
        color: 'bg-orange-100 border-orange-300 text-orange-800',
        textColor: 'text-orange-800',
        badge: 'bg-orange-500'
      }
    } else if (diffDays <= 30) {
      return {
        level: 'Médio Risco',
        color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        textColor: 'text-yellow-800',
        badge: 'bg-yellow-500'
      }
    } else {
      return {
        level: 'Baixo Risco',
        color: 'bg-green-100 border-green-300 text-green-800',
        textColor: 'text-green-800',
        badge: 'bg-green-500'
      }
    }
  }

  // Funções de manipulação
  const fetchProducts = async (code: string) => {
    if (!code || code.length < 3) return
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getProductsByBarcode(code)
      
      // Ordenar produtos por data de validade
      const sortedProducts = [...data].sort((a, b) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const expiryDateA = new Date(a.expiry_date)
        const expiryDateB = new Date(b.expiry_date)
        expiryDateA.setHours(0, 0, 0, 0)
        expiryDateB.setHours(0, 0, 0, 0)
        
        const diffDaysA = Math.ceil((expiryDateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const diffDaysB = Math.ceil((expiryDateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        return diffDaysA - diffDaysB
      })
      
      setProducts(sortedProducts)
      
      if (!data || data.length === 0) {
        setError('Produto não encontrado com este código de barras.')
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
      setError('Erro ao buscar produtos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (barcode.trim()) {
        fetchProducts(barcode.trim())
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(e.target.value)
    
    if (products.length > 0) {
      setProducts([])
    }
    if (error) {
      setError(null)
    }
  }

  const handleSearchClick = () => {
    if (barcode.trim()) {
      fetchProducts(barcode.trim())
    }
  }

  const handleClear = () => {
    setBarcode('')
    setProducts([])
    setError(null)
    setFocusInput(true)
  }

  const handleCreateProduct = () => {
    if (barcode) {
      navigate('/products/new', { state: { barcode: barcode.trim() } })
    }
  }

  const handleUpdateProduct = (productId: number) => {
    navigate(`/products/edit/${productId}`)
  }

  const handleBarcodeDetected = (detectedBarcode: string) => {
    setShowCameraScanner(false)
    setBarcode(detectedBarcode)
    fetchProducts(detectedBarcode)
  }

  // Renderização condicional com câmera
  if (showCameraScanner) {
    return <CameraBarcodeScanner onDetect={handleBarcodeDetected} />
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Leitor de Código de Barras</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
        {/* Campo de entrada de código de barras */}
        <div>
          <label htmlFor="barcode-input" className="block text-sm font-medium text-gray-700 mb-1">
            Código de Barras
          </label>
          <div className="flex">
            <input
              id="barcode-input"
              type="text"
              value={barcode}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Escaneie ou digite o código de barras"
            />
            <button
              onClick={handleSearchClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
              disabled={loading || !barcode.trim()}
            >
              Buscar
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-sm text-gray-500">
              Conecte seu leitor de código de barras USB, clique no campo acima e faça a leitura
            </p>
          </div>
        </div>

        {/* Mensagem de carregamento */}
        {loading && (
          <div className="text-center py-4">
            <p>Buscando produtos...</p>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Erro:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Resultado da busca */}
        {products.length > 0 && !loading && (
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              {products.length === 1 
                ? 'Produto encontrado!' 
                : `${products.length} produtos encontrados!`}
            </h3>
            
            <div className="space-y-4 mb-4">
              {products.map(product => {
                const risk = calculateRisk(product.expiry_date);
                return (
                  <div key={product.id} className={`border rounded-md p-3 ${risk.color}`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex">
                          <span className="font-medium w-32">Nome:</span>
                          <span>{product.name}</span>
                        </div>
                        <div className="flex">
                          <span className="font-medium w-32">Categoria:</span>
                          <span>{product.categories?.name || 'N/A'}</span>
                        </div>
                        <div className="flex">
                          <span className="font-medium w-32">Validade:</span>
                          <span className={risk.textColor}>
                            {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => handleUpdateProduct(product.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            Editar produto
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`${risk.badge} text-white text-xs font-bold px-2 py-1 rounded-full`}>
                          {risk.level}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Escanear outro
              </button>
            </div>
          </div>
        )}

        {/* Se buscou mas não encontrou, mostrar opção de cadastrar */}
        {products.length === 0 && error && !loading && (
          <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Produto não encontrado</h3>
            <p className="mb-4">Deseja cadastrar um novo produto com este código de barras?</p>
            
            <div className="flex space-x-2">
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Cadastrar novo produto
              </button>
            </div>
          </div>
        )}

        {/* Instruções */}
        {products.length === 0 && !error && !loading && (
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Instruções:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Conecte seu leitor de código de barras via USB ao computador</li>
              <li>Clique no campo de texto acima para deixá-lo ativo</li>
              <li>Escaneie o código de barras do produto</li>
              <li>Caso tenha um leitor, você também pode digitar o código manualmente</li>
              <li>Se o produto existir, serão exibidas suas informações</li>
              <li>Se não existir, você terá a opção de cadastrá-lo</li>
            </ol>
          </div>
        )}
      </div>
      
      {/* Legenda dos graus de risco */}
      {products.length > 0 && !loading && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
          <h4 className="font-medium text-gray-800 mb-2">Legenda - Grau de Risco:</h4>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full mr-2">Vencido</span>
              <span className="text-sm">Produto com validade expirada</span>
            </li>
            <li className="flex items-center">
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full mr-2">Alto Risco</span>
              <span className="text-sm">Vence em até 7 dias</span>
            </li>
            <li className="flex items-center">
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full mr-2">Médio Risco</span>
              <span className="text-sm">Vence em até 30 dias</span>
            </li>
            <li className="flex items-center">
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full mr-2">Baixo Risco</span>
              <span className="text-sm">Vence em mais de 30 dias</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default BarcodeScanner

 
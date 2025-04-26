import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsByBarcode, getProductHistoryByBarcode } from '../services/supabase'
import { fetchProductFromOpenFoodFacts, getProductName, getProductImage } from '../services/openFoodFacts'
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
  const [productInfo, setProductInfo] = useState<string | null>(null)
  const [productImage, setProductImage] = useState<string | null>(null)
  
  // Referência para controlar o tempo entre leituras
  const lastKeypressTime = useRef<number>(0)
  const keypressTimeout = useRef<NodeJS.Timeout | null>(null)

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
      setProductInfo(null)
      setProductImage(null)
      
      let productFound = false
      
      // Passo 1: Consultar a base de dados Supabase (produtos ativos)
      const data = await getProductsByBarcode(code)
      setProducts(data)
      
      // Se encontrou no Supabase, use o nome de lá com prioridade
      if (data && data.length > 0) {
        setProductInfo(data[0].name)
        productFound = true
        console.log('Produto encontrado no Supabase:', data[0].name)
      }
      
      // Passo 2: Verificar no histórico de produtos excluídos
      if (!productFound) {
        const historicalProduct = await getProductHistoryByBarcode(code)
        if (historicalProduct) {
          setProductInfo(historicalProduct.name)
          productFound = true
          console.log('Produto encontrado no histórico:', historicalProduct.name)
        }
      }
      
      // Passo 3: Buscar dados na API do Open Food Facts (como último recurso)
      const openFoodFactsData = await fetchProductFromOpenFoodFacts(code)
      console.log('Dados recebidos do Open Food Facts:', openFoodFactsData)
      
      const productName = getProductName(openFoodFactsData)
      const imageUrl = getProductImage(openFoodFactsData)
      
      console.log('Nome do produto (OpenFoodFacts):', productName)
      console.log('URL da imagem:', imageUrl)
      
      // Se não encontrou no Supabase nem no histórico, mas encontrou no OpenFoodFacts
      if (!productFound && productName) {
        setProductInfo(productName)
        productFound = true
      }
      
      // Sempre use a imagem da API se disponível, independente da origem do nome
      if (imageUrl) {
        setProductImage(imageUrl)
      }
      
      // Se não encontrou em nenhuma das fontes
      if (!productFound) {
        setError('Produto não encontrado com este código de barras.')
      }
      
      // Após processar, limpa o campo do código para evitar acumulação
      // Comentamos esta linha para não limpar o campo ainda, pois pode confundir o usuário
      // setBarcode('');
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
    const now = Date.now()
    const newValue = e.target.value
    
    // Se passaram mais de 500ms desde a última tecla ou se o campo está vazio e está entrando novo conteúdo
    // consideramos como um novo escaneamento
    if (now - lastKeypressTime.current > 500 || barcode === '') {
      // Limpar completamente o campo e substituir com o novo valor
      setBarcode(newValue)
    } else {
      // Se for um evento muito rápido (como leitor de código de barras funciona), 
      // adiciona ao valor atual
      setBarcode(newValue)
    }
    
    // Limpar os estados quando começa um novo escaneamento
    if (products.length > 0) {
      setProducts([])
    }
    if (error) {
      setError(null)
    }
    if (productInfo) {
      setProductInfo(null)
      setProductImage(null)
    }
    
    // Atualiza o tempo do último keypress
    lastKeypressTime.current = now
    
    // Define um timeout para processar automaticamente o código após 300ms de inatividade
    if (keypressTimeout.current) {
      clearTimeout(keypressTimeout.current)
    }
    
    keypressTimeout.current = setTimeout(() => {
      if (newValue.trim() && newValue.length > 7) {
        fetchProducts(newValue.trim())
      }
    }, 300)
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
    setProductInfo(null)
    setProductImage(null)
  }

  const handleCreateProduct = () => {
    if (barcode) {
      navigate('/products/new', { 
        state: { 
          barcode: barcode.trim(),
          productName: productInfo || '' 
        } 
      })
    }
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
              onFocus={(e) => {
                // Ao receber foco, selecionar todo o conteúdo para facilitar substituição
                e.target.select()
              }}
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

        {/* Interface simplificada: Apenas nome do produto e botão de cadastrar */}
        {productInfo && !loading && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            {productImage ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={productImage} 
                  alt={productInfo} 
                  className="h-48 object-contain rounded-md border border-gray-200 shadow-sm"
                  onLoad={() => console.log('Imagem carregada com sucesso')}
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', e)
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4 h-48 items-center border border-gray-200 rounded-md bg-gray-50">
                <p className="text-gray-400">Imagem não disponível</p>
              </div>
            )}
            <h3 className="text-xl font-semibold text-blue-800 mb-4 text-center">
              {productInfo}
            </h3>
          </div>
        )}

        {/* Opção de cadastrar para produtos não encontrados */}
        {!loading && barcode && !productInfo && (
          <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
            <h3 className="text-xl font-semibold text-yellow-800 mb-2 text-center">
              Produto não encontrado
            </h3>
            <p className="text-center mb-4">
              Não foi possível identificar este código de barras.
            </p>
          </div>
        )}

        {/* Botões de ação */}
        {!loading && barcode && (
          <div className="flex space-x-2">
            <button
              onClick={handleCreateProduct}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center"
            >
              <span className="mr-2">+</span> Cadastrar Produto
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center justify-center"
            >
              <span className="mr-2">↺</span> Limpar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner

 
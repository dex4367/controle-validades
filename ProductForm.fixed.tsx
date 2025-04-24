import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  getProduct, 
  createProduct, 
  updateProduct, 
  getCategories, 
  createCategory,
  uploadProductImage,
  getProductsByBarcode
} from '../services/supabase'

const ProductForm = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingBarcodeProducts, setExistingBarcodeProducts] = useState<any[]>([])
  const [showExistingProducts, setShowExistingProducts] = useState(false)

  // Estado do produto
  const [product, setProduct] = useState({
    name: '',
    barcode: '',
    category_id: 0,
    expiry_date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
    image_url: ''
  })

  useEffect(() => {
    loadCategories()
    
    if (isEditing) {
      loadProduct()
    } else {
      // Verificar se veio código de barras via state (da página de scanner)
      const barcodeFromScanner = location.state?.barcode
      if (barcodeFromScanner) {
        setProduct(prev => ({ ...prev, barcode: barcodeFromScanner }))
        handleBarcodeSearch(barcodeFromScanner)
      }
    }
  }, [id, location.state])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data || [])
      
      // Se não estiver editando e tiver categorias, selecionar a primeira por padrão
      if (!isEditing && data && data.length > 0) {
        setProduct(prev => ({ ...prev, category_id: data[0].id }))
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadProduct = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const data = await getProduct(parseInt(id))
      
      if (data) {
        setProduct({
          name: data.name,
          barcode: data.barcode || '',
          category_id: data.category_id,
          expiry_date: new Date(data.expiry_date).toISOString().split('T')[0],
          image_url: data.image_url || ''
        })

        if (data.image_url) {
          setPreviewImage(data.image_url)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setProduct(prev => ({ ...prev, [name]: value }))
    
    // Limpar resultados de pesquisa quando o código de barras é alterado
    if (name === 'barcode') {
      setExistingBarcodeProducts([])
      setShowExistingProducts(false)
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    
    // Se o valor for "new", mostrar o formulário para nova categoria
    if (value === 'new') {
      setShowNewCategoryForm(true)
    } else {
      setProduct(prev => ({ ...prev, category_id: parseInt(value) }))
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCategoryName.trim()) {
      alert('O nome da categoria é obrigatório')
      return
    }
    
    try {
      const newCategory = await createCategory(newCategoryName)
      setCategories(prev => [...prev, newCategory])
      setProduct(prev => ({ ...prev, category_id: newCategory.id }))
      setNewCategoryName('')
      setShowNewCategoryForm(false)
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      alert('Erro ao criar categoria')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImageFile(file)
    
    // Criar preview da imagem
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleBarcodeSearch = async (barcodeValue?: string) => {
    const barcode = barcodeValue || product.barcode
    
    if (!barcode) {
      alert('Digite um código de barras para buscar')
      return
    }
    
    try {
      setLoading(true)
      // Buscar todos os produtos com este código de barras
      const products = await getProductsByBarcode(barcode)
      
      if (products && products.length > 0) {
        setExistingBarcodeProducts(products)
        setShowExistingProducts(true)
        
        // Preencher os dados do primeiro produto encontrado
        const firstProduct = products[0]
        setProduct({
          ...product,
          name: firstProduct.name,
          category_id: firstProduct.category_id,
          // Não alterar a data de validade
          image_url: firstProduct.image_url || ''
        })
        
        if (firstProduct.image_url) {
          setPreviewImage(firstProduct.image_url)
        }
      } else {
        setExistingBarcodeProducts([])
        setShowExistingProducts(false)
        alert('Nenhum produto encontrado com este código de barras')
      }
    } catch (error) {
      console.error('Erro ao buscar produto por código de barras:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExistingProduct = (selectedProduct: any) => {
    setProduct({
      ...product,
      name: selectedProduct.name,
      category_id: selectedProduct.category_id,
      // Não alterar a data de validade e código de barras
      image_url: selectedProduct.image_url || ''
    })
    
    if (selectedProduct.image_url) {
      setPreviewImage(selectedProduct.image_url)
    }
    
    setShowExistingProducts(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação básica
    if (!product.name || !product.category_id || !product.expiry_date) {
      alert('Nome, categoria e data de validade são campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      
      let finalImageUrl = product.image_url
      
      // Se tiver um novo arquivo de imagem, fazer o upload
      if (imageFile) {
        const tempId = isEditing ? parseInt(id) : Date.now() // Usar ID temporário se for novo produto
        finalImageUrl = await uploadProductImage(imageFile, tempId)
      }
      
      const productData = {
        ...product,
        image_url: finalImageUrl
      }
      
      if (isEditing) {
        await updateProduct(parseInt(id), productData)
      } else {
        await createProduct(productData)
      }
      
      navigate('/products')
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
      alert('Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEditing) {
    return <div className="text-center p-6">Carregando...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto'}
      </h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna da esquerda */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={product.name}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Barras
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="barcode"
                    name="barcode"
                    className="w-full p-2 border border-gray-300 rounded-l-md"
                    value={product.barcode}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => handleBarcodeSearch()}
                    className="bg-gray-200 px-4 py-2 rounded-r-md hover:bg-gray-300"
                  >
                    Buscar
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use o leitor de código de barras USB ou digite manualmente
                </p>
              </div>
              
              {/* Exibir produtos existentes com o mesmo código de barras */}
              {showExistingProducts && existingBarcodeProducts.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">
                    {existingBarcodeProducts.length === 1 
                      ? 'Produto encontrado com este código de barras:' 
                      : `${existingBarcodeProducts.length} produtos encontrados com este código de barras:`}
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {existingBarcodeProducts.map(existingProduct => (
                      <div 
                        key={existingProduct.id}
                        className="bg-white p-3 rounded border border-blue-200 hover:bg-blue-100 cursor-pointer"
                        onClick={() => handleSelectExistingProduct(existingProduct)}
                      >
                        <div className="flex items-center">
                          {existingProduct.image_url && (
                            <img src={existingProduct.image_url} alt={existingProduct.name} className="h-10 w-10 rounded-full mr-2 object-cover" />
                          )}
                          <div>
                            <div className="font-medium">{existingProduct.name}</div>
                            <div className="text-sm text-gray-500">
                              Validade: {new Date(existingProduct.expiry_date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-blue-700">
                    <p>Clique em um produto para usar suas informações ou preencha abaixo para criar um novo lote.</p>
                    <p className="font-medium mt-1">Você está criando um novo lote do mesmo produto com validade diferente.</p>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                {!showNewCategoryForm ? (
                  <select
                    id="category_id"
                    name="category_id"
                    required
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={product.category_id}
                    onChange={handleCategoryChange}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                    <option value="new">+ Nova Categoria</option>
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nome da nova categoria"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryForm(false)}
                        className="bg-gray-300 px-3 py-1 rounded-md text-sm hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Validade *
                </label>
                <input
                  type="date"
                  id="expiry_date"
                  name="expiry_date"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={product.expiry_date}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {/* Coluna da direita */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem do Produto
                </label>
                
                <div className="mt-1 flex flex-col items-center">
                  {/* Área de preview da imagem */}
                  <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex justify-center items-center mb-2 overflow-hidden">
                    {previewImage ? (
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400">
                        Nenhuma imagem selecionada
                      </span>
                    )}
                  </div>
                  
                  {/* Input de file escondido visualmente mas acessível */}
                  <label className="w-full flex justify-center">
                    <span className="bg-brmania-green py-2 px-4 rounded-md text-white text-sm cursor-pointer hover:bg-brmania-green/90">
                      {previewImage ? 'Trocar imagem' : 'Selecionar imagem'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  
                  {previewImage && (
                    <button 
                      type="button"
                      className="mt-2 text-sm text-red-600 hover:underline"
                      onClick={() => {
                        setPreviewImage(null)
                        setImageFile(null)
                        setProduct(prev => ({ ...prev, image_url: '' }))
                      }}
                    >
                      Remover imagem
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-brmania-green text-white rounded-md hover:bg-brmania-green/90 flex items-center ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm 
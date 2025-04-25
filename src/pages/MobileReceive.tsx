import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library'
import { getProductByBarcode, createProduct, getCategories } from '../services/supabase'
import DatePicker from 'react-datepicker'
// Usando o arquivo CSS personalizado
import '../styles/datepicker.css'
// Importando ícones modernos
import { 
  FaBarcode, 
  FaCamera, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaArrowUp, 
  FaArrowDown, 
  FaEdit, 
  FaSave, 
  FaTrash, 
  FaBackspace,
  FaSearch,
  FaBoxOpen
} from 'react-icons/fa'

interface AnimationState {
  firstIndex: number;
  secondIndex: number;
  isAnimating: boolean;
  direction: 'up' | 'down';
}

const MobileReceive = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [productName, setProductName] = useState('')
  const [expiryDateStr, setExpiryDateStr] = useState('')
  const [expiryDate, setExpiryDate] = useState<Date>(new Date())
  const [categoryId, setCategoryId] = useState<number>(0)
  const [categories, setCategories] = useState<any[]>([])
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [existingProduct, setExistingProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'scan' | 'form' | 'edit'>('scan')
  const [products, setProducts] = useState<any[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [animation, setAnimation] = useState<AnimationState>({
    firstIndex: -1,
    secondIndex: -1,
    isAnimating: false,
    direction: 'up'
  })

  // Referência para o leitor de código de barras
  const codeReader = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // Inicializar o leitor de código de barras
    codeReader.current = new BrowserMultiFormatReader()
    const hints = new Map()
    hints.set(2, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
    codeReader.current.hints = hints

    // Buscar categorias no primeiro carregamento
    loadCategories()

    // Verificar se o navegador suporta getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Mostrar prompt de permissão e iniciar o scanner
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          // Parar o stream imediatamente, apenas para garantir a permissão
          stream.getTracks().forEach(track => track.stop());
          
          // Iniciar scanner com atraso
          setTimeout(() => {
            startScan();
          }, 1000);
        })
        .catch(error => {
          console.error("Erro de permissão da câmera:", error);
          setMessage({
            type: 'error',
            text: 'Permissão da câmera negada. Por favor, permita o acesso à câmera nas configurações do seu navegador.'
          });
        });
    } else {
      setMessage({
        type: 'error',
        text: 'Seu navegador não suporta acesso à câmera. Tente outro navegador.'
      });
    }

    // Limpar ao desmontar
    return () => {
      if (codeReader.current) {
        codeReader.current.reset()
        setScanning(false)
      }
    }
  }, [])

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData || [])
      if (categoriesData && categoriesData.length > 0) {
        setCategoryId(categoriesData[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      setMessage({
        type: 'error',
        text: 'Erro ao carregar categorias. Verifique sua conexão.'
      })
    }
  }

  const startScan = async () => {
    if (!codeReader.current || !videoRef.current) return
    
    try {
      setScanning(true)
      setMessage(null)
      
      // Configurações específicas para a câmera móvel
      const constraints = {
        facingMode: 'environment', // Use câmera traseira
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };
      
      // Tentar iniciar o scanner
      await navigator.mediaDevices.getUserMedia({ video: constraints })
        .then(() => {
          // Se getUserMedia for bem-sucedido, iniciar o scanner
          codeReader.current?.decodeFromConstraints(
            { video: constraints },
            videoRef.current as HTMLVideoElement,
            (result, error) => {
              if (result) {
                const barcodeValue = result.getText()
                setBarcode(barcodeValue)
                stopScan()
                checkProduct(barcodeValue)
              }
              if (error && !(error instanceof TypeError)) {
                console.error('Erro durante a leitura:', error)
              }
            }
          )
        });
    } catch (err) {
      console.error('Erro ao iniciar o scanner:', err)
      setMessage({
        type: 'error',
        text: 'Não foi possível acessar a câmera. Verifique as permissões do navegador.'
      })
      setScanning(false)
    }
  }

  const stopScan = () => {
    if (codeReader.current) {
      codeReader.current.reset()
      setScanning(false)
    }
  }

  const checkProduct = async (barcodeValue: string) => {
    try {
      setLoading(true)
      const product = await getProductByBarcode(barcodeValue)
      
      if (product) {
        setExistingProduct(product)
        setProductName(product.name)
        setCategoryId(product.category_id)
        
        // Alerta para produto já cadastrado
        setMessage({
          type: 'success',
          text: `Produto já cadastrado: ${product.name}`
        })
      } else {
        setExistingProduct(null)
        setMessage(null)
      }
      
      // Definir data de validade padrão para hoje
      const today = new Date();
      setExpiryDate(today);
      setExpiryDateStr(today.toISOString().split('T')[0]);
      setStep('form')
    } catch (error) {
      console.error('Erro ao verificar produto:', error)
      setMessage({
        type: 'error',
        text: 'Erro ao buscar produto. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(e.target.value)
  }

  const handleManualCheck = () => {
    if (barcode.trim()) {
      checkProduct(barcode.trim())
    } else {
      setMessage({
        type: 'error',
        text: 'Digite um código de barras válido'
      })
    }
  }

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setExpiryDate(date);
      setExpiryDateStr(date.toISOString().split('T')[0]);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productName || !expiryDateStr || !categoryId) {
      setMessage({
        type: 'error',
        text: 'Preencha todos os campos obrigatórios'
      })
      return
    }
    
    try {
      setLoading(true)
      
      // Verificar se já existe produto com o mesmo código de barras E mesma data de validade
      const duplicateInList = products.find(
        p => p.barcode === barcode && p.expiry_date === expiryDateStr && (editingIndex === null || products.indexOf(p) !== editingIndex)
      )
      
      if (duplicateInList) {
        setMessage({
          type: 'error',
          text: 'ATENÇÃO! Já existe um produto com mesmo código de barras e mesma data de validade na lista.'
        })
        setLoading(false)
        return
      }
      
      // Não salvar no banco de dados agora, apenas adicionar à lista
      // await createProduct({
      //   name: productName,
      //   barcode,
      //   category_id: categoryId,
      //   expiry_date: expiryDateStr
      // })
      
      // Adicionar à lista de produtos recebidos
      const category = categories.find(cat => cat.id === categoryId)
      
      if (editingIndex !== null) {
        // Editando um produto existente na lista
        const updatedProducts = [...products];
        updatedProducts[editingIndex] = {
          name: productName,
          barcode,
          category: category?.name || 'Sem categoria',
          expiry_date: expiryDateStr,
          category_id: categoryId
        };
        setProducts(updatedProducts);
        setEditingIndex(null);
      } else {
        // Adicionando novo produto
        setProducts([
          ...products, 
          {
            name: productName,
            barcode,
            category: category?.name || 'Sem categoria',
            expiry_date: expiryDateStr,
            category_id: categoryId
          }
        ]);
      }
      
      // Limpar formulário
      setBarcode('')
      setProductName('')
      setExpiryDateStr('')
      setExistingProduct(null)
      
      setMessage({
        type: 'success',
        text: editingIndex !== null ? 'Produto atualizado com sucesso!' : 'Produto adicionado à lista!'
      })
      
      // Voltar para o scanner após 1.5 segundos
      setTimeout(() => {
        setStep('scan')
        setMessage(null)
      }, 1500)
      
    } catch (error) {
      console.error('Erro ao processar produto:', error)
      setMessage({
        type: 'error',
        text: 'Erro ao processar produto. Tente novamente.'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setBarcode('')
    setProductName('')
    const today = new Date()
    setExpiryDate(today)
    setExpiryDateStr(today.toISOString().split('T')[0])
    setExistingProduct(null)
    setMessage(null)
    setStep('scan')
    setEditingIndex(null)
  }

  const handleEditProduct = (index: number) => {
    const product = products[index]
    setBarcode(product.barcode)
    setProductName(product.name)
    setCategoryId(product.category_id)
    setExpiryDateStr(product.expiry_date)
    setExpiryDate(new Date(product.expiry_date))
    setEditingIndex(index)
    setStep('form')
  }

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    // Não fazer nada se já está animando
    if (isSwapping) return;
    
    // Verificar limites da lista
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === products.length - 1)) {
      return;
    }
    
    // Identificar os dois itens que vão trocar de lugar
    const otherIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Marcar que está começando uma animação
    setIsSwapping(true);
    
    // Iniciar animação
    setAnimation({
      firstIndex: index,
      secondIndex: otherIndex,
      isAnimating: true,
      direction
    });
    
    // Aguardar a animação completar antes de trocar os itens
    setTimeout(() => {
      const updatedProducts = [...products];
      [updatedProducts[index], updatedProducts[otherIndex]] = 
        [updatedProducts[otherIndex], updatedProducts[index]];
      
      setProducts(updatedProducts);
      
      // Finalizar animação
      setAnimation({
        firstIndex: -1,
        secondIndex: -1,
        isAnimating: false,
        direction: 'up'
      });
      setIsSwapping(false);
    }, 450); // Tempo apenas para visualizar a animação
  }

  // Função para determinar a classe CSS com base no estado de animação
  const getAnimationClass = (index: number) => {
    if (!animation.isAnimating || (index !== animation.firstIndex && index !== animation.secondIndex)) {
      return '';
    }
    
    const isFirstItem = index === animation.firstIndex;
    const isMovingUp = animation.direction === 'up';
    
    // Aplicar animação de transição direta
    if (isFirstItem) {
      // Item que está sendo movido (clicado)
      return isMovingUp 
        ? 'transform -translate-y-full transition-transform duration-450 ease-in-out bg-blue-50' 
        : 'transform translate-y-full transition-transform duration-450 ease-in-out bg-blue-50';
    } else {
      // O outro item envolvido na troca
      return isMovingUp 
        ? 'transform translate-y-full transition-transform duration-450 ease-in-out bg-green-50' 
        : 'transform -translate-y-full transition-transform duration-450 ease-in-out bg-green-50';
    }
  }

  const handleFinishReceiving = async () => {
    if (products.length === 0) {
      setMessage({
        type: 'error',
        text: 'Adicione pelo menos um produto antes de finalizar'
      });
      return;
    }

    try {
      setLoading(true);
      setMessage({
        type: 'success',
        text: 'Salvando produtos, aguarde...'
      });

      // Contador de produtos adicionados e ignorados
      let addedCount = 0;
      let skippedCount = 0;

      // Enviar todos os produtos para o banco de dados
      for (const product of products) {
        // Verificar se já existe o produto com o mesmo código de barras e mesma data de validade
        const existingProduct = await getProductByBarcode(product.barcode);
        
        if (existingProduct && existingProduct.expiry_date === product.expiry_date) {
          console.log(`Produto ignorado: ${product.name} - mesmo código e mesma validade já existe no sistema`);
          skippedCount++;
          continue; // Pula para o próximo produto
        }
        
        // Adiciona o produto no banco de dados
        await createProduct({
          name: product.name,
          barcode: product.barcode,
          category_id: product.category_id,
          expiry_date: product.expiry_date
        });
        
        addedCount++;
      }

      // Limpar a lista após salvar
      setProducts([]);
      setBarcode('');
      setProductName('');
      
      // Atualizar os estados de data
      const today = new Date();
      setExpiryDate(today);
      setExpiryDateStr(today.toISOString().split('T')[0]);
      
      setExistingProduct(null);
      
      let resultMessage = `${addedCount} produto(s) recebido(s) com sucesso!`;
      if (skippedCount > 0) {
        resultMessage += ` ${skippedCount} produto(s) ignorado(s) por já existirem no sistema.`;
      }
      
      setMessage({
        type: 'success',
        text: resultMessage
      });
      
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Erro ao finalizar recebimento:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao salvar produtos. Verifique sua conexão.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brmania-light">
      <header className="bg-brmania-green text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Escanear Produto</h1>
          {step === 'scan' && products.length > 0 && (
            <span className="bg-brmania-yellow text-brmania-dark px-3 py-1 rounded-full text-sm font-semibold">
              {products.length} {products.length === 1 ? 'item' : 'itens'}
            </span>
          )}
          {step !== 'scan' && (
            <button 
              onClick={() => setStep('scan')}
              className="text-white bg-brmania-dark/20 hover:bg-brmania-dark/30 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4">
        {step === 'scan' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {scanning ? (
              <div className="relative">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-80 object-cover aspect-[4/3]"
                    playsInline={true}
                    autoPlay={true}
                    muted={true}
                  ></video>
                  <div className="absolute inset-0 border-2 border-brmania-yellow box-content pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-brmania-yellow rounded-lg"></div>
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-brmania-yellow rounded-lg opacity-50 animate-pulse"></div>
                  </div>
                  <div className="absolute bottom-16 left-0 right-0 text-center">
                    <span className="bg-black/50 text-white px-4 py-2 rounded-full text-sm inline-block">
                      Posicione o código de barras dentro do quadro
                    </span>
                  </div>
                </div>
                <button
                  onClick={stopScan}
                  className="absolute bottom-4 right-4 bg-red-500 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center shadow-lg"
                >
                  <FaTimesCircle className="mr-2" /> Parar
                </button>
              </div>
            ) : (
              <div className="p-6">
                {message && message.type === 'error' && (
                  <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
                    <p className="flex items-center">
                      <FaTimesCircle className="mr-2" /> {message.text}
                    </p>
                    <button 
                      onClick={() => {
                        setMessage(null);
                        // Solicitar permissão novamente
                        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                          .then(stream => {
                            // Liberar a stream
                            stream.getTracks().forEach(track => track.stop());
                            // Tentar escanear novamente
                            setTimeout(() => startScan(), 500);
                          })
                          .catch(err => {
                            console.error("Erro ao solicitar permissão:", err);
                            setMessage({
                              type: 'error',
                              text: 'Permissão negada. Verifique as configurações do seu navegador.'
                            });
                          });
                      }}
                      className="mt-3 bg-red-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
                
                <div className="bg-brmania-light p-8 rounded-lg flex flex-col items-center justify-center">
                  <FaBarcode className="text-7xl text-brmania-green mb-4" />
                  <p className="text-brmania-dark text-center mb-4">Câmera não disponível</p>
                  <button
                    onClick={startScan}
                    className="bg-brmania-green text-white py-3 px-6 rounded-lg font-medium flex justify-center items-center shadow-lg mb-4"
                  >
                    <FaCamera className="mr-2" /> Abrir Câmera
                  </button>
                </div>

                <div className="mt-6">
                  <p className="text-brmania-dark text-center mb-4">Não está funcionando? Digite o código manualmente:</p>
                  <div className="flex mb-4">
                    <input
                      type="text"
                      value={barcode}
                      onChange={handleBarcodeInput}
                      placeholder="Digite o código de barras"
                      className="flex-1 p-3 border border-gray-300 bg-white text-brmania-dark rounded-l-lg focus:outline-none focus:ring-2 focus:ring-brmania-green"
                    />
                    <button
                      onClick={handleManualCheck}
                      className="bg-brmania-green text-white p-3 rounded-r-lg"
                    >
                      <FaSearch />
                    </button>
                  </div>
                </div>
                
                {products.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={handleFinishReceiving}
                      className="w-full bg-brmania-yellow text-brmania-dark py-3 px-4 rounded-lg font-medium flex justify-center items-center shadow-lg"
                    >
                      <FaSave className="mr-2" /> Finalizar Recebimento ({products.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-semibold text-brmania-dark mb-4 flex items-center">
              {editingIndex !== null ? 
                <><FaEdit className="mr-2 text-brmania-green" /> Editar Produto</> : 
                <><FaBoxOpen className="mr-2 text-brmania-green" /> Novo Produto</>
              }
            </h2>

            {message && (
              <div className={`p-3 rounded-lg mb-4 ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message.type === 'success' ? 
                  <FaCheckCircle className="inline mr-2" /> : 
                  <FaTimesCircle className="inline mr-2" />
                }
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={handleBarcodeInput}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brmania-green"
                  readOnly={existingProduct !== null}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brmania-green"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade</label>
                <DatePicker
                  selected={expiryDate}
                  onChange={handleDateChange}
                  dateFormat="dd/MM/yyyy"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brmania-green"
                  required
                  minDate={new Date()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brmania-green"
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-brmania-green text-white py-2 rounded-lg font-medium flex justify-center items-center"
                  disabled={loading}
                >
                  {loading ? 'Processando...' : (
                    <>
                      <FaSave className="mr-2" /> 
                      {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-brmania-yellow text-brmania-dark py-2 rounded-lg font-medium flex justify-center items-center"
                >
                  <FaBackspace className="mr-2" /> Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {products.length > 0 && step === 'scan' && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-4">
            <h2 className="text-lg font-semibold text-brmania-dark mb-4 flex items-center">
              <FaBoxOpen className="mr-2 text-brmania-green" /> Produtos Recebidos
            </h2>
            
            <ul className="divide-y divide-gray-200">
              {products.map((product, index) => (
                <li 
                  key={`${product.barcode}-${index}`} 
                  className={`py-3 ${getAnimationClass(index)}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-brmania-dark">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        <span className="inline-block bg-brmania-yellow bg-opacity-30 text-brmania-dark px-2 py-0.5 rounded-full text-xs mr-2">
                          {product.category}
                        </span>
                        Venc: {new Date(product.expiry_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        <FaBarcode className="inline mr-1" /> {product.barcode}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditProduct(index)}
                        className="p-2 rounded-full text-brmania-yellow hover:bg-yellow-100"
                      >
                        <FaEdit />
                      </button>
                      
                      <button 
                        onClick={() => {
                          const updatedProducts = [...products];
                          updatedProducts.splice(index, 1);
                          setProducts(updatedProducts);
                        }}
                        className="p-2 rounded-full text-red-500 hover:bg-red-100"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

export default MobileReceive 
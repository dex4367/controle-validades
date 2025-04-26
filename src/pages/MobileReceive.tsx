import { useState, useRef, useEffect } from 'react'
import { getProductByBarcode, createProduct, getCategories, getProductNameSuggestions, saveProductNameToHistory, getProductHistoryByBarcode } from '../services/supabase'
import { fetchProductFromOpenFoodFacts, getProductName } from '../services/openFoodFacts'
// Removendo a importação do DatePicker que não será mais necessária
// import DatePicker from 'react-datepicker'
// import '../styles/datepicker.css'
import { 
  FaBarcode, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaArrowUp, 
  FaArrowDown, 
  FaEdit, 
  FaSave, 
  FaTrash, 
  FaBackspace,
  FaSearch,
  FaBoxOpen,
  FaCamera,
  FaCalendarAlt,
  FaPlus
} from 'react-icons/fa'
import BarcodeScanner from '../components/BarcodeScanner'
import CameraBarcodeScanner from './CameraBarcodeScanner'

interface AnimationState {
  firstIndex: number;
  secondIndex: number;
  isAnimating: boolean;
  direction: 'up' | 'down';
}

const MobileReceive = () => {
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
  const [products, setProducts] = useState<any[]>(() => {
    const savedProducts = localStorage.getItem('mobileReceiveProducts');
    return savedProducts ? JSON.parse(savedProducts) : [];
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSwapping, setIsSwapping] = useState(false)
  const [animation, setAnimation] = useState<AnimationState>({
    firstIndex: -1,
    secondIndex: -1,
    isAnimating: false,
    direction: 'up'
  })
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)

  useEffect(() => {
    // Buscar categorias no primeiro carregamento
    loadCategories()
  }, [])

  useEffect(() => {
    localStorage.setItem('mobileReceiveProducts', JSON.stringify(products));
  }, [products]);

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

  const checkProduct = async (barcodeValue: string) => {
    try {
      console.log('🔎 checkProduct iniciado para código:', barcodeValue);
      setLoading(true)
      
      let productFound = false
      
      // Passo 1: Consultar a base de dados Supabase (produtos ativos)
      const product = await getProductByBarcode(barcodeValue)
      console.log('📦 Resultado da busca:', product ? 'Produto encontrado' : 'Produto não encontrado');
      
      // Se encontrou no Supabase, use o nome de lá com prioridade
      if (product) {
        // Produto encontrado no banco de dados ativo
        setExistingProduct(product)
        setProductName(product.name)
        setCategoryId(product.category_id)
        productFound = true
        
        // Alerta para produto já cadastrado
        setMessage({
          type: 'success',
          text: `Produto já cadastrado: ${product.name}`
        })
      }
      
      // Passo 2: Verificar no histórico de produtos excluídos
      if (!productFound) {
        const historicalProduct = await getProductHistoryByBarcode(barcodeValue);
        
        if (historicalProduct) {
          // Produto encontrado no histórico (foi excluído anteriormente)
          setExistingProduct(null)
          setProductName(historicalProduct.name)
          productFound = true
          // Categoria precisa ser selecionada manualmente já que não temos essa info no histórico
          
          setMessage({
            type: 'success',
            text: `Produto encontrado no histórico: ${historicalProduct.name}`
          })
        }
      }
      
      // Passo 3: Buscar dados na API do Open Food Facts (como último recurso)
      if (!productFound) {
        try {
          console.log('📡 Buscando na API Open Food Facts para o código:', barcodeValue);
          const openFoodFactsData = await fetchProductFromOpenFoodFacts(barcodeValue);
          console.log('📡 Resposta da API Open Food Facts:', openFoodFactsData);
          
          const productNameFromAPI = getProductName(openFoodFactsData);
          console.log('📡 Nome do produto obtido da API:', productNameFromAPI);
          
          if (productNameFromAPI) {
            // Produto encontrado na API do Open Food Facts
            setExistingProduct(null);
            setProductName(productNameFromAPI);
            productFound = true;
            
            setMessage({
              type: 'success',
              text: `Produto identificado: ${productNameFromAPI}`
            });
            console.log('📡 Produto identificado com sucesso pela API:', productNameFromAPI);
          } else {
            console.log('📡 API não retornou um nome de produto válido');
          }
        } catch (apiError) {
          console.error('📡 Erro ao consultar a API Open Food Facts:', apiError);
        }
      }
      
      // Se não encontrou em nenhuma das fontes
      if (!productFound) {
        // Produto realmente novo
        setExistingProduct(null)
        setProductName('') // Limpar nome para produto novo
        setMessage(null)
      }
      
      // Definir data de validade padrão como vazia para o novo sistema
      setExpiryDateStr('');
      
      console.log('🔄 Alterando step para "form"');
      setStep('form');
      console.log('✅ Step alterado para:', 'form');
    } catch (error) {
      console.error('❌ Erro ao verificar produto:', error)
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

  const handleCameraButtonClick = () => {
    setIsCameraOpen(true)
  }

  const handleCameraClose = () => {
    setIsCameraOpen(false)
  }

  const handleBarcodeDetected = (detectedBarcode: string) => {
    // Se o código for vazio, significa que o usuário cancelou o scanner
    if (!detectedBarcode) {
      setIsCameraOpen(false)
      return
    }
    
    // Código de barras detectado com sucesso
    setBarcode(detectedBarcode)
    setIsCameraOpen(false)
    // Executar verificação do produto automaticamente após a detecção
    checkProduct(detectedBarcode)
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove caracteres não numéricos, exceto barras
    value = value.replace(/[^\d\/]/g, '');
    
    // Formatação automática com duas barras
    if (value.length > 0) {
      // Remove barras existentes primeiro para evitar duplicação
      const digitsOnly = value.replace(/\//g, '');
      
      // Aplica novamente a formatação
      if (digitsOnly.length <= 2) {
        // Apenas dia
        value = digitsOnly;
      } else if (digitsOnly.length <= 4) {
        // Dia e mês - 1234 -> 12/34
        value = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`;
      } else {
        // Dia, mês e ano - 123456 -> 12/34/56
        value = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 6)}`;
      }
    }
    
    // Atualizar o valor no campo
    setExpiryDateStr(value);
    
    // Extrair componentes para atualizar o objeto Date
    const digitsOnly = value.replace(/\//g, '');
    
    if (digitsOnly.length >= 6) {
      try {
        const day = parseInt(digitsOnly.slice(0, 2));
        const month = parseInt(digitsOnly.slice(2, 4)) - 1; // Mês em JS é 0-indexado
        const year = parseInt(`20${digitsOnly.slice(4, 6)}`); // Assume anos 2000
        
        const dateObj = new Date(year, month, day);
        
        // Verifica se é uma data válida
        if (!isNaN(dateObj.getTime())) {
          setExpiryDate(dateObj);
        }
      } catch (error) {
        console.error('Erro ao converter data:', error);
      }
    }
  };

  const fetchProductNameSuggestions = async (query: string) => {
    if (query.length < 2) return;
    
    try {
      const suggestions = await getProductNameSuggestions(query);
      setNameSuggestions(suggestions);
      setShowNameSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Erro ao buscar sugestões de nomes:', error);
    }
  }

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductName(value);
    
    // Buscar sugestões quando o nome é digitado
    if (value.length >= 2) {
      fetchProductNameSuggestions(value);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
  }

  const handleSelectNameSuggestion = (name: string) => {
    setProductName(name);
    setNameSuggestions([]);
    setShowNameSuggestions(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productName || !barcode || !expiryDateStr || !categoryId) {
      setMessage({
        type: 'error',
        text: 'Preencha todos os campos obrigatórios'
      });
      return;
    }
    
    // Processamento da data com validação mais flexível
    let formattedDate = '';
    let day = 0, month = 0, year = 0;
    
    // Verificar se a data tem barras
    if (expiryDateStr.includes('/')) {
      const parts = expiryDateStr.split('/');
      if (parts.length < 3) {
        setMessage({
          type: 'error',
          text: 'Formato de data inválido. Use DD/MM/AA'
        });
        return;
      }
      
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(`20${parts[2]}`);
    } else if (expiryDateStr.length === 6) {
      // Formato sem barra (DDMMAA)
      day = parseInt(expiryDateStr.slice(0, 2));
      month = parseInt(expiryDateStr.slice(2, 4));
      year = parseInt(`20${expiryDateStr.slice(4, 6)}`);
    } else {
      setMessage({
        type: 'error',
        text: 'Formato de data inválido. Use DD/MM/AA'
      });
      return;
    }
    
    // Validação de dia e mês
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      setMessage({
        type: 'error',
        text: 'Data de validade inválida. Verifique dia e mês.'
      });
      return;
    }
    
    // Criar objeto de data para verificação final
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) {
      setMessage({
        type: 'error',
        text: 'Data de validade inválida.'
      });
      return;
    }
    
    // Formato da data para o banco de dados (yyyy-mm-dd)
    formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    // Continuação do código de envio...
    try {
      setLoading(true)
      
      // Verificar se já existe produto com o mesmo código de barras E mesma data de validade
      const duplicateInList = products.find(
        p => p.barcode === barcode && p.expiry_date === formattedDate && (editingIndex === null || products.indexOf(p) !== editingIndex)
      )
      
      if (duplicateInList) {
        setMessage({
          type: 'error',
          text: 'ATENÇÃO! Já existe um produto com mesmo código de barras e mesma data de validade na lista.'
        })
        setLoading(false)
        return
      }
      
      // Salvar o nome no histórico, mesmo que não salve o produto ainda
      await saveProductNameToHistory(productName, barcode);
      
      // Adicionar à lista de produtos recebidos
      const category = categories.find(cat => cat.id === categoryId)
      
      if (editingIndex !== null) {
        // Editando um produto existente na lista
        const updatedProducts = [...products];
        updatedProducts[editingIndex] = {
          name: productName,
          barcode,
          category: category?.name || 'Sem categoria',
          expiry_date: formattedDate,
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
            expiry_date: formattedDate,
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
    setExpiryDateStr('')
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
    
    // Formatar data para DD/MM/AA
    const date = new Date(product.expiry_date)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(2)
    setExpiryDateStr(`${day}/${month}/${year}`)
    
    setExpiryDate(date)
    setEditingIndex(index)
    setStep('form')
  }

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === products.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Configura a animação
    setAnimation({
      firstIndex: index,
      secondIndex: newIndex,
      isAnimating: true,
      direction
    });
    
    setIsSwapping(true);
    
    // Executa a troca após um pequeno delay para a animação ter efeito
    setTimeout(() => {
      const newProducts = [...products];
      const temp = newProducts[index];
      newProducts[index] = newProducts[newIndex];
      newProducts[newIndex] = temp;
      setProducts(newProducts);
      
      // Limpa a animação após um curto período
      setTimeout(() => {
        setAnimation({
          firstIndex: -1,
          secondIndex: -1,
          isAnimating: false,
          direction: 'up'
        });
        setIsSwapping(false);
      }, 300);
    }, 300);
  }

  const getAnimationClass = (index: number) => {
    if (!animation.isAnimating) return '';
    
    if (index === animation.firstIndex) {
      return animation.direction === 'up' ? 'animate-slide-up' : 'animate-slide-down';
    }
    
    if (index === animation.secondIndex) {
      return animation.direction === 'up' ? 'animate-slide-down' : 'animate-slide-up';
    }
    
    return '';
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
          expiry_date: product.expiry_date // Agora já está no formato correto (yyyy-mm-dd)
        });
        
        addedCount++;
      }

      // Limpar a lista após salvar
      setProducts([]);
      // Limpar também no localStorage
      localStorage.removeItem('mobileReceiveProducts');
      
      setBarcode('');
      setProductName('');
      
      // Limpar a data de validade
      setExpiryDateStr('');
      setExpiryDate(new Date());
      
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-brmania-green text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Cadastrar Produto</h1>
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
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Recebimento de Produtos</h2>
          
          {step === 'scan' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Escaneie ou digite o código de barras
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Barras
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      id="barcode"
                      value={barcode}
                      onChange={handleBarcodeInput}
                      className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Digite ou escaneie o código"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && handleManualCheck()}
                    />
                    <button
                      onClick={handleManualCheck}
                      disabled={loading || !barcode.trim()}
                      className="bg-brmania-green text-white px-4 py-2 rounded-r-md hover:bg-green-700 disabled:bg-green-300"
                    >
                      <FaSearch className="text-lg" />
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={handleCameraButtonClick}
                    className="flex-1 flex items-center justify-center bg-brmania-green text-white p-3 rounded-md hover:bg-green-700"
                  >
                    <FaCamera className="mr-2" />
                    <span>Usar Câmera</span>
                  </button>
                </div>
                
                {message && (
                  <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.type === 'success' ? <FaCheckCircle className="inline mr-2" /> : <FaTimesCircle className="inline mr-2" />}
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {step === 'form' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                {editingIndex !== null ? 
                  <><FaEdit className="mr-2 text-green-600" /> Editar Produto</> : 
                  <><FaBoxOpen className="mr-2 text-green-600" /> Novo Produto</>
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly={existingProduct !== null}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productName}
                      onChange={handleProductNameChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      autoComplete="off"
                      onBlur={() => {
                        // Pequeno delay para permitir clique na sugestão
                        setTimeout(() => setShowNameSuggestions(false), 200);
                      }}
                      onFocus={() => {
                        if (productName.length >= 2 && nameSuggestions.length > 0) {
                          setShowNameSuggestions(true);
                        }
                      }}
                    />
                    {showNameSuggestions && nameSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {nameSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSelectNameSuggestion(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade (DD/MM/AA)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expiryDateStr}
                      onChange={handleExpiryDateChange}
                      onPaste={(e) => {
                        // Permitir colar data e formatá-la automaticamente
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        // Remove caracteres não numéricos
                        const numbers = pastedText.replace(/[^\d]/g, '');
                        
                        if (numbers.length > 0) {
                          // Remove barras existentes primeiro para evitar duplicação
                          const digitsOnly = numbers.replace(/\//g, '');
                          
                          // Aplica formatação baseada no tamanho
                          if (digitsOnly.length <= 2) {
                            // Apenas dia
                            setExpiryDateStr(digitsOnly);
                          } else if (digitsOnly.length <= 4) {
                            // Dia e mês - 1234 -> 12/34
                            setExpiryDateStr(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`);
                          } else {
                            // Dia, mês e ano - 123456 -> 12/34/56
                            setExpiryDateStr(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 6)}`);
                            
                            // Atualiza o objeto de data
                            try {
                              const day = parseInt(digitsOnly.slice(0, 2));
                              const month = parseInt(digitsOnly.slice(2, 4)) - 1;
                              const year = parseInt(`20${digitsOnly.slice(4, 6)}`);
                              const dateObj = new Date(year, month, day);
                              
                              if (!isNaN(dateObj.getTime())) {
                                setExpiryDate(dateObj);
                              }
                            } catch (error) {
                              console.error('Erro ao converter data colada:', error);
                            }
                          }
                        }
                      }}
                      placeholder="DD/MM/AA"
                      maxLength={8}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <FaCalendarAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Formato: Dia/Mês/Ano (ex: 31/12/23)</p>
                </div>
  
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 bg-brmania-green text-white py-2 rounded-lg font-medium flex justify-center items-center hover:bg-green-700"
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
                    className="flex-1 bg-brmania-yellow text-brmania-dark py-2 rounded-lg font-medium flex justify-center items-center hover:bg-yellow-500"
                  >
                    <FaBackspace className="mr-2" /> Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {products.length > 0 && step === 'scan' && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FaBoxOpen className="mr-2 text-green-600" /> Produtos Recebidos ({products.length})
              </h2>
              
              <ul className="divide-y divide-gray-200">
                {products.map((product, index) => (
                  <li 
                    key={`${product.barcode}-${index}`} 
                    className={`py-3 ${getAnimationClass(index)}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          <span className="inline-block bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs mr-2">
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
                          className="p-2 rounded-full text-yellow-500 hover:bg-yellow-100"
                        >
                          <FaEdit />
                        </button>
                        
                        <button 
                          onClick={() => {
                            const updatedProducts = [...products];
                            const productToRemove = updatedProducts[index];
                            
                            // Salvar o nome do produto no histórico antes de remover
                            if (productToRemove.name && productToRemove.barcode) {
                              saveProductNameToHistory(productToRemove.name, productToRemove.barcode)
                                .catch(err => console.error('Erro ao salvar nome do produto excluído:', err));
                            }
                            
                            updatedProducts.splice(index, 1);
                            setProducts(updatedProducts);
                          }}
                          className="p-2 rounded-full text-red-500 hover:bg-red-100"
                        >
                          <FaTrash />
                        </button>

                        {/* Botões de ordem restaurados */}
                        {index > 0 && (
                          <button 
                            onClick={() => !isSwapping && handleMoveProduct(index, 'up')}
                            disabled={isSwapping}
                            className="p-2 rounded-full text-blue-500 hover:bg-blue-100 disabled:opacity-50"
                          >
                            <FaArrowUp />
                          </button>
                        )}
                        
                        {index < products.length - 1 && (
                          <button 
                            onClick={() => !isSwapping && handleMoveProduct(index, 'down')}
                            disabled={isSwapping}
                            className="p-2 rounded-full text-blue-500 hover:bg-blue-100 disabled:opacity-50"
                          >
                            <FaArrowDown />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              
              {/* Botão de finalizar recebimento restaurado */}
              <div className="mt-4">
                <button
                  onClick={handleFinishReceiving}
                  className="w-full bg-brmania-green text-white py-3 rounded-lg font-medium flex justify-center items-center hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Processando...' : 'Finalizar Recebimento'}
                </button>
              </div>
            </div>
          )}
          
          {/* Scanner de código de barras com câmera */}
          {isCameraOpen && (
            <CameraBarcodeScanner 
              onDetect={handleBarcodeDetected}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default MobileReceive 
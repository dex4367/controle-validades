import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, deleteProduct } from '../services/supabase'
import { isExpired, calculateDaysRemaining, exportFilteredProducts } from '../services/reports'
// Importando ícones modernos
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSortNumericDown,
  FaSortNumericUp,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa'

// Função para remover duplicatas pelo código de barras (manterá apenas o primeiro item de cada código de barras)
const deduplicateProductsByBarcode = (products: any[]): any[] => {
  const seen = new Set();
  return products.filter(product => {
    // Se o produto não tem código de barras, mantém ele
    if (!product.barcode) return true;
    
    // Se o código de barras já foi visto, ignora este produto
    if (seen.has(product.barcode)) return false;
    
    // Senão, adiciona o código de barras ao conjunto e mantém o produto
    seen.add(product.barcode);
    return true;
  });
};

// Tipos de status para filtro
type StatusFilter = 'all' | 'expired' | 'next7days' | 'next30days' | 'next60days' | 'valid';

const ProductList = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<'name' | 'expiry_date'>('expiry_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [exportLoading, setExportLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<{id: number, name: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    fetchProducts()
  }, [])
  
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const rawData = await getProducts()
      
      // Aplicar deduplicação por código de barras
      const uniqueProducts = deduplicateProductsByBarcode(rawData || []);
      setProducts(uniqueProducts);
      
      // Extrair categorias únicas para o filtro
      const categorySet = new Set<string>()
      uniqueProducts.forEach(product => {
        if (product.categories?.name) {
          categorySet.add(product.categories.name)
        }
      })
      setCategories(categorySet)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const openDeleteModal = (id: number, name: string) => {
    setProductToDelete({ id, name });
    setShowDeleteModal(true);
  };
  
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
    setIsDeleting(false);
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete.id);
      setProducts(products.filter(product => product.id !== productToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      // Mantenha o modal aberto em caso de erro, apenas desative o indicador de carregamento
      setIsDeleting(false);
    }
  };
  
  // Filtrar produtos com base nos critérios de busca e categoria
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      product.categories?.name === selectedCategory;
    
    // Filtro de status
    const daysRemaining = calculateDaysRemaining(product.expiry_date);
    const expired = isExpired(product.expiry_date);
    
    let matchesStatus = true;
    if (statusFilter === 'expired') {
      matchesStatus = expired;
    } else if (statusFilter === 'next7days') {
      matchesStatus = !expired && daysRemaining <= 7;
    } else if (statusFilter === 'next30days') {
      matchesStatus = !expired && daysRemaining <= 30;
    } else if (statusFilter === 'next60days') {
      matchesStatus = !expired && daysRemaining <= 60;
    } else if (statusFilter === 'valid') {
      matchesStatus = !expired;
    }
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Ordenar produtos
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      const dateA = new Date(a.expiry_date).getTime();
      const dateB = new Date(b.expiry_date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
  
  // Função para formatar o status com base nos dias restantes
  const getStatusDisplay = (expiryDate: string) => {
    const daysRemaining = calculateDaysRemaining(expiryDate);
    const expired = isExpired(expiryDate);
    
    if (expired) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
          Vencido há {Math.abs(daysRemaining)} dias
        </span>
      );
    } else if (daysRemaining <= 7) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
          Vence em {daysRemaining} dias
        </span>
      );
    } else if (daysRemaining <= 30) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brmania-yellow/20 text-brmania-dark">
          Vence em {daysRemaining} dias
        </span>
      );
    } else if (daysRemaining <= 60) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          Vence em {daysRemaining} dias
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-brmania-green/20 text-brmania-green">
          Vence em {daysRemaining} dias
        </span>
      );
    }
  };
  
  const handleSort = (field: 'name' | 'expiry_date') => {
    if (field === sortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Exportar produtos filtrados para Excel
  const handleExportFilteredProducts = () => {
    setExportLoading(true);
    
    try {
      // Construir descrição do filtro aplicado
      let filterDescription = 'Todos os produtos';
      
      if (searchTerm) {
        filterDescription = `Busca por: "${searchTerm}"`;
      }
      
      if (selectedCategory !== 'all') {
        filterDescription += (filterDescription !== 'Todos os produtos' ? ' + ' : '') + 
          `Categoria: ${selectedCategory}`;
      }
      
      if (statusFilter !== 'all') {
        const statusText = {
          'valid': 'Produtos válidos',
          'expired': 'Produtos vencidos',
          'next7days': 'Vencendo em 7 dias',
          'next30days': 'Vencendo em 30 dias',
          'next60days': 'Vencendo em 60 dias'
        }[statusFilter];
        
        filterDescription += (filterDescription !== 'Todos os produtos' ? ' + ' : '') + 
          `Status: ${statusText}`;
      }
      
      // Exportar produtos
      exportFilteredProducts(sortedProducts, filterDescription);
      
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      alert('Erro ao exportar produtos para Excel');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-6">Carregando...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-brmania-dark">Lista de Produtos</h2>
        <Link
          to="/products/new"
          className="bg-brmania-green text-white px-4 py-2 rounded-md hover:bg-brmania-green/90 transition flex items-center"
        >
          <FaPlus className="mr-2" /> Novo Produto
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Busca */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-brmania-dark mb-1 flex items-center">
              <FaSearch className="mr-1 text-brmania-green" /> Buscar produtos
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="w-full p-2 border border-gray-300 rounded-md pl-9 focus:outline-none focus:ring-2 focus:ring-brmania-green"
                placeholder="Nome ou código de barras"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          
          {/* Filtro de categoria */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-brmania-dark mb-1 flex items-center">
              <FaFilter className="mr-1 text-brmania-green" /> Categoria
            </label>
            <select
              id="category"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brmania-green"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {Array.from(categories).map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          {/* Filtro de status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-brmania-dark mb-1 flex items-center">
              <FaFilter className="mr-1 text-brmania-green" /> Status
            </label>
            <select
              id="status"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brmania-green"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">Todos os status</option>
              <option value="valid">Produtos válidos</option>
              <option value="expired">Produtos vencidos</option>
              <option value="next7days">Vencendo em 7 dias</option>
              <option value="next30days">Vencendo em 30 dias</option>
              <option value="next60days">Vencendo em 60 dias</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-brmania-dark">
            {filteredProducts.length} produtos encontrados
          </p>
          
          <button
            onClick={handleExportFilteredProducts}
            disabled={exportLoading || filteredProducts.length === 0}
            className={`flex items-center text-sm px-3 py-1 rounded 
              ${exportLoading || filteredProducts.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-brmania-green text-white hover:bg-brmania-green/90'
              }`}
          >
            <FaFileExcel className="mr-1" />
            {exportLoading ? 'Exportando...' : 'Exportar para Excel'}
          </button>
        </div>

        {/* Tabela de produtos */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-brmania-light">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Nome
                    <span className="ml-1">
                      {sortBy === 'name' ? (
                        sortDirection === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />
                      ) : (
                        <FaSort className="text-gray-400" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">
                  Código de Barras
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('expiry_date')}
                >
                  <div className="flex items-center">
                    Validade
                    <span className="ml-1">
                      {sortBy === 'expiry_date' ? (
                        sortDirection === 'asc' ? <FaSortNumericDown /> : <FaSortNumericUp />
                      ) : (
                        <FaSort className="text-gray-400" />
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-brmania-dark uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProducts.length > 0 ? (
                sortedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-brmania-light/50">
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark font-medium">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark">
                      {product.categories?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark">
                      <span className="font-mono">{product.barcode || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark">
                      {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusDisplay(product.expiry_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/products/edit/${product.id}`}
                          className="text-brmania-green hover:text-brmania-green/80 p-1"
                          title="Editar"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          onClick={() => openDeleteModal(product.id, product.name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 italic">
                    Nenhum produto encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-brmania-accent">
                <FaExclamationTriangle className="text-2xl mr-2" />
                <h3 className="text-xl font-bold">Confirmar exclusão</h3>
              </div>
              <button 
                onClick={closeDeleteModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <p className="mb-6">
              Tem certeza que deseja excluir o produto <span className="font-bold">{productToDelete?.name}</span>? 
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center min-w-[80px]"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductList 
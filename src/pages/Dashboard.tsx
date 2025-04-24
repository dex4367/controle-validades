import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../services/supabase'
import { isExpired, calculateDaysRemaining } from '../utils/dateUtils'
// Importando ícones modernos
import { 
  FaBoxOpen, 
  FaExclamationTriangle, 
  FaClock, 
  FaPlus, 
  FaBarcode, 
  FaFileAlt,
  FaChevronRight,
  FaExclamationCircle
} from 'react-icons/fa'

const Dashboard = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    expiringSoon: 0 // produtos que vencem em até 30 dias
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await getProducts()
        setProducts(data || [])
        
        // Calcular estatísticas
        const expired = data?.filter(product => isExpired(product.expiry_date))?.length || 0
        const expiringSoon = data?.filter(product => {
          const days = calculateDaysRemaining(product.expiry_date)
          return days >= 0 && days <= 30
        })?.length || 0
        
        setStats({
          total: data?.length || 0,
          expired,
          expiringSoon
        })
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Produtos que estão vencendo nos próximos 30 dias, ordenados por data de validade
  const upcomingProducts = products
    .filter(product => {
      const days = calculateDaysRemaining(product.expiry_date)
      return days >= 0 && days <= 30
    })
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 5) // Mostrar apenas os 5 primeiros

  if (loading) {
    return <div className="text-center p-6">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-brmania-green">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Total de Produtos</h3>
              <p className="text-3xl font-bold text-brmania-green mt-2">{stats.total}</p>
            </div>
            <FaBoxOpen className="text-3xl text-brmania-green opacity-70" />
          </div>
          <Link to="/products" className="text-brmania-green hover:underline text-sm inline-flex items-center mt-3">
            Ver todos os produtos <FaChevronRight className="ml-1 text-xs" />
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-brmania-accent">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Produtos Vencidos</h3>
              <p className="text-3xl font-bold text-brmania-accent mt-2">{stats.expired}</p>
            </div>
            <FaExclamationTriangle className="text-3xl text-brmania-accent opacity-70" />
          </div>
          <Link to="/reports" className="text-brmania-accent hover:underline text-sm inline-flex items-center mt-3">
            Gerar relatório <FaChevronRight className="ml-1 text-xs" />
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-brmania-yellow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Vencendo em 30 dias</h3>
              <p className="text-3xl font-bold text-brmania-yellow mt-2">{stats.expiringSoon}</p>
            </div>
            <FaClock className="text-3xl text-brmania-yellow opacity-70" />
          </div>
          <Link to="/reports" className="text-brmania-yellow hover:underline text-sm inline-flex items-center mt-3">
            Gerar relatório <FaChevronRight className="ml-1 text-xs" />
          </Link>
        </div>
      </div>
      
      {/* Ações rápidas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-brmania-dark mb-4 flex items-center">
          <FaExclamationCircle className="mr-2 text-brmania-green" /> Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            to="/products/new" 
            className="bg-brmania-green text-white p-4 rounded-lg text-center hover:bg-brmania-green/90 transition flex items-center justify-center"
          >
            <FaPlus className="mr-2" /> Cadastrar Produto
          </Link>
          <Link 
            to="/scanner" 
            className="bg-brmania-green text-white p-4 rounded-lg text-center hover:bg-brmania-green/90 transition flex items-center justify-center"
          >
            <FaBarcode className="mr-2" /> Escanear Código de Barras
          </Link>
          <Link 
            to="/reports" 
            className="bg-brmania-yellow text-brmania-dark p-4 rounded-lg text-center hover:bg-brmania-yellow/90 transition flex items-center justify-center"
          >
            <FaFileAlt className="mr-2" /> Gerar Relatórios
          </Link>
        </div>
      </div>
      
      {/* Produtos vencendo em breve */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-brmania-dark mb-4 flex items-center">
          <FaClock className="mr-2 text-brmania-yellow" /> Produtos Vencendo em Breve
        </h3>
        
        {upcomingProducts.length === 0 ? (
          <p className="text-gray-500 italic">Não há produtos vencendo nos próximos 30 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-brmania-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Produto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Data de Validade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Dias Restantes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-brmania-light/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/products/edit/${product.id}`} className="text-brmania-green hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.categories?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${calculateDaysRemaining(product.expiry_date) <= 7 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-brmania-yellow/20 text-brmania-dark'}`}>
                        {calculateDaysRemaining(product.expiry_date)} dias
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {upcomingProducts.length > 0 && (
          <div className="mt-4">
            <Link to="/reports" className="text-brmania-green hover:underline inline-flex items-center">
              Ver todos os produtos vencendo em breve <FaChevronRight className="ml-1 text-xs" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard 
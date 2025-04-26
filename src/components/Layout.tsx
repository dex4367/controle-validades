import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
// Importando ícones modernos
import { FaChartBar, FaBoxOpen, FaBarcode, FaFileAlt, FaTags, FaStore } from 'react-icons/fa'

/**
 * Propriedades do componente Layout
 */
interface LayoutProps {
  children: ReactNode
}

/**
 * Definição de item do menu lateral
 */
interface MenuItem {
  path: string
  label: string
  icon: ReactNode
}

/**
 * Componente de layout principal do aplicativo
 */
const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  
  // Itens do menu lateral
  const menuItems: MenuItem[] = [
    { path: '/', label: 'Dashboard', icon: <FaChartBar /> },
    { path: '/products', label: 'Produtos', icon: <FaBoxOpen /> },
    { path: '/scanner', label: 'Leitor de Barcode', icon: <FaBarcode /> },
    { path: '/reports', label: 'Relatórios', icon: <FaFileAlt /> },
    { path: '/categories', label: 'Categorias', icon: <FaTags /> },
  ]

  return (
    <div className="flex h-screen bg-brmania-light">
      {/* Menu lateral */}
      <div className="w-64 bg-brmania-green text-white">
        <div className="p-4">
          {/* Título da aplicação */}
          <div className="flex items-center justify-center mb-8 mt-2">
            <FaStore className="text-3xl mr-2 text-brmania-yellow" />
            <h1 className="text-2xl font-bold">Controle de Validades</h1>
          </div>
          
          {/* Menu de navegação */}
          <nav>
            <ul>
              {menuItems.map((item) => (
                <li key={item.path} className="mb-2">
                  <Link
                    to={item.path}
                    className={`flex items-center p-3 rounded-lg hover:bg-brmania-yellow hover:text-brmania-dark transition-colors ${
                      location.pathname === item.path ? 'bg-brmania-yellow text-brmania-dark' : ''
                    }`}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-md p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-brmania-dark">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Controle de Validades'}
            </h2>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

export default Layout 
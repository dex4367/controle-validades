import { Navigate, createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import ProductForm from './pages/ProductForm'
import ProductList from './pages/ProductList'
import Reports from './pages/Reports'
import Dashboard from './pages/Dashboard'
import MobileReceive from './pages/MobileReceive'
import { Outlet } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Outlet /></Layout>,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/products/add',
        element: <ProductForm />
      },
      {
        path: '/products/edit/:id',
        element: <ProductForm />
      },
      {
        path: '/products',
        element: <ProductList />
      },
      {
        path: '/reports',
        element: <Reports />
      },
      {
        path: '/mobile-receive',
        element: <MobileReceive />
      }
    ]
  }
])

export default router 
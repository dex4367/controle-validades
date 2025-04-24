import { useState, useEffect } from 'react'
import { getProducts, Product, deleteProduct } from '../services/supabase'
import { 
  generateProductsReport, 
  generateExpiringProductsReport,
  isExpired,
  calculateDaysRemaining
} from '../services/reports'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
// Importando ícones modernos
import {
  FaFilePdf,
  FaFileExcel, 
  FaChartBar, 
  FaExclamationCircle, 
  FaCalendarAlt, 
  FaCalendarWeek,
  FaTrashAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa'

type ReportType = 'all' | 'expired' | 'expiring7' | 'expiring30' | null;

// Função para remover duplicatas pelo código de barras (manterá apenas o primeiro item de cada código de barras)
const deduplicateProductsByBarcode = (products: Product[]): Product[] => {
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

const Reports = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(null)
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' })
  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    expiringIn7: 0,
    expiringIn30: 0,
    expiringIn60: 0,
    expiringIn90: 0
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!products || products.length === 0) return;
    
    let tempFiltered: Product[] = [];
    
    switch (selectedReportType) {
      case 'all':
        tempFiltered = [...products];
        break;
      case 'expired':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          return expiryDate < today;
        });
        break;
      case 'expiring7':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 && diffDays <= 7;
        });
        break;
      case 'expiring30':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 && diffDays <= 30;
        });
        break;
      default:
        tempFiltered = [...products];
        break;
    }
    
    // Aplicar deduplicação por código de barras
    const deduplicated = deduplicateProductsByBarcode(tempFiltered);
    setFilteredProducts(deduplicated);
  }, [selectedReportType, products]);
} 
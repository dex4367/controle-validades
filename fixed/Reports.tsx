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
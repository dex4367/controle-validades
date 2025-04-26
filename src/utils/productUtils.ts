import { Product } from '../services/supabase';

/**
 * Utilitários para manipulação de produtos
 */

/**
 * Agrupa produtos pelo código de barras, mantendo produtos com validades diferentes
 * @param products Lista de produtos para deduplicação
 * @returns Lista de produtos sem duplicações por código de barras para mesma validade
 */
export const deduplicateProductsByBarcode = (products: Product[]): Product[] => {
  const uniqueMap = new Map<string, Product>();
  
  products.forEach(product => {
    if (product.barcode && product.barcode.trim() !== '') {
      // A chave única é a combinação de código de barras + data de validade
      const key = `${product.barcode}|${product.expiry_date}`;
      
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, product);
      }
    } else {
      // Se não tiver código de barras, considera pelo ID
      uniqueMap.set(`id_${product.id}`, product);
    }
  });
  
  return Array.from(uniqueMap.values());
};

/**
 * Remove produtos duplicados baseados no nome e data de validade
 * @param products Lista de produtos para deduplicação
 * @returns Lista de produtos sem duplicações por nome e data
 */
export const deduplicateProductsByNameAndDate = (products: Product[]): Product[] => {
  const uniqueProducts = new Map<string, Product>();
  
  products.forEach(product => {
    const key = `${product.name}-${product.expiry_date}`;
    
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, product);
    }
  });
  
  return Array.from(uniqueProducts.values());
};

/**
 * Remove produtos duplicados baseados apenas no código de barras do produto
 * Mantém apenas o produto com a data de validade mais próxima
 * @param products Lista de produtos para deduplicação
 * @returns Lista de produtos sem duplicações por código de barras
 */
export const deduplicateProductsByName = (products: Product[]): Product[] => {
  const uniqueProducts = new Map<string, Product>();
  
  products.forEach(product => {
    // Usar o código de barras ou ID como chave única
    const key = product.barcode && product.barcode.trim() !== '' 
      ? product.barcode 
      : product.id.toString();
    
    // Verifica se o produto já existe no Map
    if (uniqueProducts.has(key)) {
      const existingProduct = uniqueProducts.get(key);
      const existingDate = new Date(existingProduct!.expiry_date);
      const newDate = new Date(product.expiry_date);
      
      // Se a nova data for mais próxima, substitui
      if (newDate < existingDate) {
        uniqueProducts.set(key, product);
      }
    } else {
      uniqueProducts.set(key, product);
    }
  });
  
  return Array.from(uniqueProducts.values());
}; 
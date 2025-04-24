import { Product } from '../services/supabase';

/**
 * Utilitários para manipulação de produtos
 */

/**
 * Agrupa produtos pelo código de barras, mantendo produtos com validades diferentes
 * Este método permite que um mesmo produto (mesmo código de barras) apareça
 * múltiplas vezes na lista se tiver datas de validade diferentes
 */
export const deduplicateProductsByBarcode = (products: Product[]): Product[] => {
  // Criar mapa de produtos pelo código+validade
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
 */
export const deduplicateProductsByNameAndDate = (products: Product[]): Product[] => {
  const uniqueProducts = new Map<string, Product>();
  
  products.forEach(product => {
    const key = `${product.name}-${product.expiry_date}`;
    
    // Adiciona o produto ao Map se a chave ainda não existir
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, product);
    }
  });
  
  return Array.from(uniqueProducts.values());
};

/**
 * Remove produtos duplicados baseados apenas no código de barras do produto
 * Se não houver código de barras, usa o ID como fallback
 */
export const deduplicateProductsByName = (products: Product[]): Product[] => {
  const uniqueProducts = new Map<string, Product>();
  
  products.forEach(product => {
    // Usar o código de barras como chave única
    const key = product.barcode && product.barcode.trim() !== '' 
      ? product.barcode 
      : product.id.toString();
    
    // Se o produto já existe no Map, verificamos se o novo tem data de validade mais próxima
    if (uniqueProducts.has(key)) {
      const existingProduct = uniqueProducts.get(key);
      const existingDate = new Date(existingProduct!.expiry_date);
      const newDate = new Date(product.expiry_date);
      
      // Se a nova data for mais próxima (anterior) à existente, substitui
      if (newDate < existingDate) {
        uniqueProducts.set(key, product);
      }
    } else {
      // Se não existe, adiciona ao Map
      uniqueProducts.set(key, product);
    }
  });
  
  return Array.from(uniqueProducts.values());
}; 
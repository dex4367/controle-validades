import { getProducts, deleteProduct, Product } from '../services/supabase';

interface DuplicateAnalysisResult {
  success: boolean;
  totalProducts?: number;
  uniqueNames?: number;
  duplicateGroups?: number;
  keepProducts?: Product[];
  deleteProducts?: Product[];
  totalToDelete?: number;
  deletedCount?: number;
  error?: string;
}

/**
 * Script para identificar e remover produtos duplicados
 * Detecta duplicatas baseadas em nome do produto e data de validade similar
 * 
 * @param actuallyDelete Se verdadeiro, realmente exclui os produtos duplicados
 * @returns Resultado da análise com informações sobre duplicatas
 */
async function removeDuplicateProducts(actuallyDelete = false): Promise<DuplicateAnalysisResult> {
  try {
    console.log('🔍 Iniciando detecção de produtos duplicados...');
    
    // 1. Buscar todos os produtos
    const allProducts = await getProducts();
    console.log(`📋 Total de produtos encontrados: ${allProducts.length}`);
    
    // 2. Agrupar produtos por nome (normalizado - sem espaços, tudo minúsculo)
    const productsByName: Record<string, Product[]> = {};
    
    allProducts.forEach(product => {
      // Normalizar o nome para agrupar produtos similares
      const normalizedName = product.name.toLowerCase().trim();
      
      if (!productsByName[normalizedName]) {
        productsByName[normalizedName] = [];
      }
      productsByName[normalizedName].push(product);
    });
    
    // 3. Identificar grupos de produtos com o mesmo nome
    const duplicateGroups = Object.entries(productsByName)
      .filter(([_, group]) => group.length > 1)
      .map(([groupName, group]) => ({
        name: groupName,
        count: group.length,
        products: group
      }));
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
} 
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
      .map(([normalizedName, group]) => ({
        name: normalizedName,
        count: group.length,
        products: group
      }));
    
    console.log(`🔎 Encontrados ${duplicateGroups.length} nomes de produtos com possíveis duplicatas`);
    
    // 4. Para cada grupo de produtos com o mesmo nome, verificar datas de validade
    let totalDeleted = 0;
    const deletedProducts: Product[] = [];
    const keepProducts: Product[] = [];

    for (const { name, count, products } of duplicateGroups) {
      // 5. Para cada grupo, verificar datas de validade
      for (let i = 0; i < count; i++) {
        const product = products[i];
        const productToCompare = products[i + 1];

        if (product.validityDate === productToCompare.validityDate) {
          // 6. Se datas de validade forem iguais, excluir o produto duplicado
          deletedProducts.push(product);
          totalDeleted++;
        } else {
          // 7. Se datas de validade forem diferentes, manter o produto
          keepProducts.push(product);
        }
      }
    }

    // 8. Atualizar o resultado com os produtos mantidos e excluídos
    const result: DuplicateAnalysisResult = {
      success: true,
      totalProducts: allProducts.length,
      uniqueNames: Object.keys(productsByName).length,
      duplicateGroups: duplicateGroups.length,
      keepProducts,
      deleteProducts: deletedProducts,
      totalToDelete: totalDeleted,
      deletedCount: totalDeleted
    };

    if (actuallyDelete) {
      // 9. Se realmente excluir, excluir os produtos duplicados
      await Promise.all(deletedProducts.map(product => deleteProduct(product.id)));
      result.success = true;
    } else {
      result.success = false;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ocorreu um erro ao processar os produtos duplicados'
    };
  }
}

export default removeDuplicateProducts; 
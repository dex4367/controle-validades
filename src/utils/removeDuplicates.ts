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
      .map(([name, group]) => ({
        name,
        count: group.length,
        products: group
      }));
    
    console.log(`🔎 Encontrados ${duplicateGroups.length} nomes de produtos com possíveis duplicatas`);
    
    // 4. Para cada grupo de produtos com o mesmo nome, verificar datas de validade
    let totalDeleted = 0;
    const deletedProducts: Product[] = [];
    const keepProducts: Product[] = [];
    
    for (const group of duplicateGroups) {
      console.log(`\n🔍 Analisando duplicatas para: "${group.name}" (${group.count} produtos)`);
      
      // Agrupar por data de validade (considerando datas próximas como iguais)
      const productsByExpiry: Record<string, Product[]> = {};
      
      group.products.forEach(product => {
        const expiryDate = new Date(product.expiry_date);
        const expiryKey = expiryDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        if (!productsByExpiry[expiryKey]) {
          productsByExpiry[expiryKey] = [];
        }
        productsByExpiry[expiryKey].push(product);
      });
      
      // Para cada data de validade, manter apenas um produto
      for (const [expiryDate, products] of Object.entries(productsByExpiry)) {
        if (products.length > 1) {
          console.log(`  📅 Data de validade: ${expiryDate} - ${products.length} produtos duplicados`);
          
          // Ordenar por: 
          // 1. Tem código de barras (prioridade para produtos com barcode)
          // 2. ID mais baixo (presumindo que o mais antigo é mais correto)
          products.sort((a, b) => {
            // Prioridade para produtos com código de barras
            if (a.barcode && !b.barcode) return -1;
            if (!a.barcode && b.barcode) return 1;
            
            // Se ambos têm ou ambos não têm código, use o ID mais baixo
            return a.id - b.id;
          });
          
          // Manter o primeiro produto após ordenação
          const keepProduct = products[0];
          const deleteList = products.slice(1);
          
          keepProducts.push(keepProduct);
          
          console.log(`  ✅ Mantendo: ID=${keepProduct.id}, Nome="${keepProduct.name}", Código=${keepProduct.barcode || 'N/A'}`);
          
          // Excluir os demais produtos
          for (const product of deleteList) {
            console.log(`  🗑️ ${actuallyDelete ? 'Excluindo' : 'Simulando exclusão'}: ID=${product.id}, Nome="${product.name}", Código=${product.barcode || 'N/A'}`);
            
            if (actuallyDelete) {
              try {
                await deleteProduct(product.id);
                console.log(`     ✓ Produto ID=${product.id} excluído com sucesso`);
              } catch (error) {
                console.error(`     ❌ Erro ao excluir produto ID=${product.id}:`, error);
                throw error;
              }
            }
            
            deletedProducts.push(product);
            totalDeleted++;
          }
        }
      }
    }
    
    console.log(`\n✨ ${actuallyDelete ? 'Exclusão' : 'Análise'} concluída!`);
    if (actuallyDelete) {
      console.log(`🗑️ Total de produtos excluídos: ${totalDeleted}`);
    } else {
      console.log(`📝 Para excluir os produtos duplicados, execute com parâmetro actuallyDelete=true`);
      console.log(`📊 Total de produtos a serem mantidos: ${keepProducts.length}`);
      console.log(`🗑️ Total de produtos a serem excluídos: ${totalDeleted}`);
    }
    
    return {
      success: true,
      totalProducts: allProducts.length,
      uniqueNames: Object.keys(productsByName).length,
      duplicateGroups: duplicateGroups.length,
      keepProducts,
      deleteProducts: deletedProducts,
      totalToDelete: totalDeleted,
      deletedCount: actuallyDelete ? totalDeleted : 0
    };
  } catch (error: any) {
    console.error('❌ Erro ao analisar duplicatas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar a função quando este arquivo for executado diretamente
if (typeof require !== 'undefined' && require.main === module) {
  removeDuplicateProducts(false) // passar true para realmente excluir
    .then(result => {
      if (result.success) {
        console.log('✅ Script executado com sucesso!');
      } else {
        console.error('❌ Falha na execução do script:', result.error);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Erro fatal:', err);
      process.exit(1);
    });
}

export default removeDuplicateProducts; 
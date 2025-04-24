import { supabase } from '../services/supabase';

/**
 * Remove produtos duplicados da base de dados automaticamente
 * Considera como duplicados apenas produtos com o mesmo código de barras E mesma data de validade
 * 
 * Esta função é executada automaticamente quando importada
 */
export const removeDuplicates = async () => {
  try {
    console.log('[SISTEMA] Iniciando verificação automática de produtos duplicados...');
    
    // Obtém todos os produtos
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!products || products.length === 0) {
      console.log('[SISTEMA] Nenhum produto encontrado para análise');
      return { groupsFound: 0, deleted: 0 };
    }

    // Agrupa produtos pelo código de barras + data de validade
    const groupedByBarcodeAndDate = {};
    products.forEach(product => {
      if (product.barcode && product.barcode.trim() !== '') {
        // Cria uma chave composta com código de barras + data de validade
        const key = `${product.barcode}|${product.expiry_date}`;
        if (!groupedByBarcodeAndDate[key]) {
          groupedByBarcodeAndDate[key] = [];
        }
        groupedByBarcodeAndDate[key].push(product);
      }
    });

    // Encontra grupos com mais de um produto (duplicados reais)
    const duplicateGroups = Object.values(groupedByBarcodeAndDate).filter(
      group => group.length > 1
    );

    if (duplicateGroups.length === 0) {
      console.log('[SISTEMA] Nenhum produto duplicado encontrado');
      return { groupsFound: 0, deleted: 0 };
    }

    console.log(`[SISTEMA] Encontrados ${duplicateGroups.length} grupos de produtos duplicados`);

    // Para cada grupo de duplicados, mantém apenas o primeiro e exclui os outros
    let deletedCount = 0;
    
    for (const group of duplicateGroups) {
      // Ordena por data de criação (decrescente) e mantém o mais recente
      group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // O primeiro item do grupo (mais recente) será mantido
      const [keep, ...duplicatesToDelete] = group;
      
      // Exclui as duplicatas
      for (const duplicate of duplicatesToDelete) {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', duplicate.id);
          
        if (deleteError) {
          console.error(`[SISTEMA] Erro ao excluir produto ID ${duplicate.id}:`, deleteError);
        } else {
          deletedCount++;
        }
      }
    }

    console.log(`[SISTEMA] Limpeza automática concluída: ${deletedCount} produtos duplicados foram removidos`);
    return { groupsFound: duplicateGroups.length, deleted: deletedCount };
  } catch (error) {
    console.error('[SISTEMA] Erro ao remover duplicatas:', error.message);
    return { error: error.message };
  }
};

// Executa a limpeza automaticamente quando o módulo é importado
removeDuplicates();

export default removeDuplicates; 
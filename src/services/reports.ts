import * as XLSX from 'xlsx'

interface ExportOptions {
  fileName?: string
  sheetName?: string
}

export const exportToExcel = (
  data: any[],
  options: ExportOptions = {}
) => {
  const {
    fileName = 'relatório',
    sheetName = 'Dados'
  } = options

  // Criar uma workbook
  const wb = XLSX.utils.book_new()
  
  // Converter dados para planilha
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Adicionar a planilha ao workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  
  // Trigger para download
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

export const generateProductsReport = (products: any[], isExpired = false) => {
  // Formatar os dados para o Excel
  const data = products.map(product => ({
    'Nome do Produto': product.name,
    'Código de Barras': product.barcode || 'N/A',
    'Categoria': product.categories?.name || 'N/A',
    'Data de Validade': new Date(product.expiry_date).toLocaleDateString('pt-BR'),
    'Status': isExpired ? 'Vencido' : calculateDaysRemaining(product.expiry_date) <= 7 ? 'Vence em breve' : 'Válido',
    'Dias Restantes': isExpired ? 'Vencido' : calculateDaysRemaining(product.expiry_date)
  }));

  // Criar planilha Excel
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

  // Definir largura das colunas
  const wscols = [
    { wch: 30 }, // Nome do Produto
    { wch: 15 }, // Código de Barras
    { wch: 15 }, // Categoria
    { wch: 15 }, // Data de Validade
    { wch: 15 }, // Status
    { wch: 15 }  // Dias Restantes
  ];
  worksheet['!cols'] = wscols;

  // Gerar e baixar o arquivo
  const reportName = isExpired ? 'produtos_vencidos' : 'todos_produtos';
  XLSX.writeFile(workbook, `${reportName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateExpiringProductsReport = (products: any[], days: number) => {
  // Filtrar produtos que vencem em X dias
  const expiringProducts = products.filter(product => {
    const daysRemaining = calculateDaysRemaining(product.expiry_date);
    return !isExpired(product.expiry_date) && daysRemaining <= days;
  });

  // Formatar os dados para o Excel
  const data = expiringProducts.map(product => {
    const daysRemaining = calculateDaysRemaining(product.expiry_date);
    return {
      'Nome do Produto': product.name,
      'Código de Barras': product.barcode || 'N/A',
      'Categoria': product.categories?.name || 'N/A',
      'Data de Validade': new Date(product.expiry_date).toLocaleDateString('pt-BR'),
      'Dias Restantes': daysRemaining,
      'Status': daysRemaining <= 7 ? 'Crítico' : daysRemaining <= 30 ? 'Atenção' : 'Monitorar'
    };
  });

  // Criar planilha Excel
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Vencendo em ${days} dias`);

  // Definir largura das colunas
  const wscols = [
    { wch: 30 }, // Nome do Produto
    { wch: 15 }, // Código de Barras
    { wch: 15 }, // Categoria
    { wch: 15 }, // Data de Validade
    { wch: 15 }, // Dias Restantes
    { wch: 15 }  // Status
  ];
  worksheet['!cols'] = wscols;

  // Gerar e baixar o arquivo
  XLSX.writeFile(workbook, `produtos_vencendo_em_${days}_dias_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Função auxiliar para verificar se um produto está vencido
export const isExpired = (expiryDate: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(expiryDate)
  return today > expDate
}

// Função auxiliar para calcular dias restantes até a validade
export const calculateDaysRemaining = (expiryDate: string): number => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(expiryDate)
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Nova função para exportar lista filtrada de produtos
export const exportFilteredProducts = (products: any[], filterDescription: string) => {
  // Formatar os dados para o Excel com mais detalhes
  const data = products.map(product => {
    const daysRemaining = calculateDaysRemaining(product.expiry_date);
    const expired = isExpired(product.expiry_date);
    
    let status = '';
    if (expired) {
      status = `Vencido há ${Math.abs(daysRemaining)} dias`;
    } else if (daysRemaining <= 7) {
      status = `Vence em ${daysRemaining} dias (CRÍTICO)`;
    } else if (daysRemaining <= 30) {
      status = `Vence em ${daysRemaining} dias (ATENÇÃO)`;
    } else if (daysRemaining <= 60) {
      status = `Vence em ${daysRemaining} dias (MONITORAR)`;
    } else {
      status = `Vence em ${daysRemaining} dias`;
    }
    
    return {
      'Nome do Produto': product.name,
      'Código de Barras': product.barcode || 'N/A',
      'Categoria': product.categories?.name || 'N/A',
      'Data de Validade': new Date(product.expiry_date).toLocaleDateString('pt-BR'),
      'Dias Restantes': expired ? '-' + Math.abs(daysRemaining) : daysRemaining,
      'Status': status
    };
  });

  // Criar planilha Excel
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Produtos');
  
  // Adicionar informações sobre o filtro aplicado
  const filterInfo = [
    ['Filtro aplicado:', filterDescription],
    ['Data de exportação:', new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')],
    ['Total de produtos:', products.length.toString()]
  ];
  
  // Criar planilha de informações
  const infoWorksheet = XLSX.utils.aoa_to_sheet(filterInfo);
  XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'Informações');

  // Definir largura das colunas da planilha principal
  const wscols = [
    { wch: 30 }, // Nome do Produto
    { wch: 15 }, // Código de Barras
    { wch: 15 }, // Categoria
    { wch: 15 }, // Data de Validade
    { wch: 15 }, // Dias Restantes
    { wch: 30 }  // Status
  ];
  worksheet['!cols'] = wscols;

  // Gerar e baixar o arquivo
  const fileName = `produtos_filtrados_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  
  return fileName;
}; 
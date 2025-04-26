import * as XLSX from 'xlsx';
import { isExpired, calculateDaysRemaining } from '../utils/dateUtils';

interface ExportOptions {
  fileName?: string;
  sheetName?: string;
}

export function exportToExcel(data: any[], options: ExportOptions = {}): void {
  const {
    fileName = 'relatório',
    sheetName = 'Dados'
  } = options;

  // Criar uma workbook
  const wb = XLSX.utils.book_new();
  
  // Converter dados para planilha
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Adicionar a planilha ao workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Trigger para download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function generateProductsReport(products: any[], isExpiredParam = false, dateRangeDescription = ''): void {
  // Formatar os dados para o Excel
  const data = products.map(product => ({
    'Nome do Produto': product.name,
    'Código de Barras': product.barcode || 'N/A',
    'Categoria': product.categories?.name || 'N/A',
    'Data de Validade': new Date(product.expiry_date).toLocaleDateString('pt-BR'),
    'Status': isExpiredParam ? 'Vencido' : calculateDaysRemaining(product.expiry_date) <= 7 ? 'Vence em breve' : 'Válido',
    'Dias Restantes': isExpiredParam ? 'Vencido' : calculateDaysRemaining(product.expiry_date)
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
  const reportName = isExpiredParam ? 'produtos_vencidos' : 'todos_produtos';
  const fileName = `${reportName}${dateRangeDescription.replace(/[\/]/g, '-')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function generateExpiringProductsReport(products: any[], days: number, dateRangeDescription = ''): void {
  // Formatar os dados para o Excel
  const data = products.map(product => {
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
  const fileName = `produtos_vencendo_em_${days}_dias${dateRangeDescription.replace(/[\/]/g, '-')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportFilteredProducts(products: any[], filterDescription: string): string {
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
} 
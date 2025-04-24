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
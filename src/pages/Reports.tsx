import { useState, useEffect } from 'react'
import { 
  getProducts, 
  Product, 
  deleteProduct,
  isExpired,
  calculateDaysRemaining,
  generateProductsReport, 
  generateExpiringProductsReport
} from '../services'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
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

const Reports = () => {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(null)
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' })
  const [stats, setStats] = useState({
    total: 0,
    expired: 0,
    expiringIn7: 0,
    expiringIn30: 0,
    expiringIn60: 0,
    expiringIn90: 0
  })
  // Novos estados para o filtro de datas
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!products || products.length === 0) return;
    
    let tempFiltered: Product[] = [];
    
    switch (selectedReportType) {
      case 'all':
        tempFiltered = [...products];
        break;
      case 'expired':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          return expiryDate < today;
        });
        break;
      case 'expiring7':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 && diffDays <= 7;
        });
        break;
      case 'expiring30':
        tempFiltered = products.filter(product => {
          const expiryDate = new Date(product.expiry_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 && diffDays <= 30;
        });
        break;
      default:
        tempFiltered = [...products];
        break;
    }
    
    // Aplicar filtro de datas se ambas as datas estiverem selecionadas
    if (startDate && endDate) {
      tempFiltered = tempFiltered.filter(product => {
        const expiryDate = new Date(product.expiry_date);
        return expiryDate >= startDate && expiryDate <= endDate;
      });
    }
    
    // Aplicar deduplicação por código de barras
    const deduplicated = deduplicateProductsByBarcode(tempFiltered);
    setFilteredProducts(deduplicated);
  }, [selectedReportType, products, startDate, endDate]);

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      
      // Remover duplicatas antes de calcular estatísticas
      const uniqueProducts = deduplicateProductsByBarcode(data || []);
      
      // Usar os produtos únicos para todos os cálculos
      setProducts(uniqueProducts)
      
      // Calcular estatísticas com os dados já deduplicados
      if (uniqueProducts.length > 0) {
        const expired = uniqueProducts.filter(product => isExpired(product.expiry_date)).length
        const expiringIn7 = uniqueProducts.filter(product => {
          const days = calculateDaysRemaining(product.expiry_date)
          return !isExpired(product.expiry_date) && days <= 7
        }).length
        const expiringIn30 = uniqueProducts.filter(product => {
          const days = calculateDaysRemaining(product.expiry_date)
          return !isExpired(product.expiry_date) && days <= 30
        }).length
        const expiringIn60 = uniqueProducts.filter(product => {
          const days = calculateDaysRemaining(product.expiry_date)
          return !isExpired(product.expiry_date) && days <= 60
        }).length
        const expiringIn90 = uniqueProducts.filter(product => {
          const days = calculateDaysRemaining(product.expiry_date)
          return !isExpired(product.expiry_date) && days <= 90
        }).length
        
        setStats({
          total: uniqueProducts.length,
          expired,
          expiringIn7,
          expiringIn30,
          expiringIn60,
          expiringIn90
        })
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = () => {
    if (selectedReportType === 'all') {
      generateProductsReport(filteredProducts, false, getDateRangeDescription());
    } else if (selectedReportType === 'expired') {
      generateProductsReport(filteredProducts, true, getDateRangeDescription());
    } else if (selectedReportType === 'expiring7') {
      generateExpiringProductsReport(filteredProducts, 7, getDateRangeDescription());
    } else if (selectedReportType === 'expiring30') {
      generateExpiringProductsReport(filteredProducts, 30, getDateRangeDescription());
    }
  }

  const getDateRangeDescription = () => {
    if (startDate && endDate) {
      return ` (${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')})`;
    }
    return '';
  }

  const handleGeneratePdfReport = () => {
    if (!selectedReportType || filteredProducts.length === 0) return;

    const doc = new jsPDF();
    const title = getReportTitle();
    const date = new Date().toLocaleDateString('pt-BR');

    // Título do PDF
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Relatório gerado em: ${date}${getDateRangeDescription()}`, 14, 29);

    // Cabeçalhos da tabela (com Código de Barras)
    const tableColumn = ["Código", "Nome", "Categoria", "Validade"];
    // Dados da tabela (com Código de Barras)
    const tableRows: any[][] = [];

    filteredProducts.forEach(product => {
      const productData = [
        product.barcode || 'N/A', // Usar código de barras
        product.name,
        product.categories?.name || 'N/A',
        new Date(product.expiry_date).toLocaleDateString('pt-BR')
      ];
      tableRows.push(productData);
    });

    // Gerar a tabela
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35, // Posição inicial da tabela
      theme: 'striped', // Tema da tabela
      headStyles: { fillColor: [0, 154, 61] }, // Cor do cabeçalho verde BR Mania
    });

    // Rodapé com contagem
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    }
    doc.setFontSize(12);
    doc.text(`Total de produtos: ${filteredProducts.length}`, 14, doc.internal.pageSize.getHeight() - 15);

    // Salvar o PDF
    doc.save(`${title.replace(/\s+/g, '_')}_${date}.pdf`);
  }

  const getReportTitle = () => {
    switch (selectedReportType) {
      case 'all': return 'Todos os Produtos';
      case 'expired': return 'Produtos Vencidos';
      case 'expiring7': return 'Produtos Vencendo em 7 Dias';
      case 'expiring30': return 'Produtos Vencendo em 30 Dias';
      default: return '';
    }
  }

  // Função para excluir todos os produtos vencidos
  const handleDeleteExpiredProducts = async () => {
    // Verificar se há produtos vencidos
    if (stats.expired === 0) return;
    
    // Mostrar diálogo de confirmação
    setShowConfirmDialog(true);
  };

  // Executar a exclusão após confirmação
  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      setShowConfirmDialog(false);
      
      // Obter produtos vencidos
      const expiredProducts = products.filter(product => isExpired(product.expiry_date));
      
      // Excluir cada produto vencido
      for (const product of expiredProducts) {
        await deleteProduct(product.id);
      }
      
      // Recarregar dados
      await fetchProducts();
      
      // Mostrar notificação de sucesso
      setNotification({
        show: true,
        type: 'success',
        message: `${expiredProducts.length} produtos vencidos foram excluídos com sucesso.`
      });
      
      // Ocultar notificação após 5 segundos
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
    } catch (error) {
      console.error('Erro ao excluir produtos:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'Erro ao excluir produtos vencidos. Tente novamente.'
      });
      
      // Ocultar notificação após 5 segundos
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
  };

  // Função para formatar as datas para exibição
  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Selecione um período';
    
    const formatDate = (date: Date | null) => {
      if (!date) return '';
      
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const day = date.getDate();
      const month = date.toLocaleString('pt-BR', { month: 'short' });
      
      return `${days[date.getDay()]} ${day} ${month}`;
    };
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} — ${formatDate(endDate)}`;
    }
    
    return startDate ? formatDate(startDate) : formatDate(endDate);
  };

  // Função para limpar as datas
  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  if (loading) {
    return <div className="text-center p-6">Carregando...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-brmania-dark mb-6 flex items-center">
        <FaChartBar className="mr-2 text-brmania-green" /> Relatórios
      </h2>

      {notification.show && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        } flex items-center`}>
          {notification.type === 'success' ? (
            <FaCheck className="mr-2" />
          ) : (
            <FaTimes className="mr-2" />
          )}
          {notification.message}
        </div>
      )}

      {/* Filtro de período */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold text-brmania-dark mb-3 flex items-center">
          <FaCalendarAlt className="mr-2 text-brmania-green" /> Filtrar por período
        </h3>
        
        <div className="relative">
          <div 
            className="p-3 border rounded-md cursor-pointer flex justify-between items-center"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <div className="flex items-center">
              <FaCalendarAlt className="text-gray-400 mr-2" />
              <span>{formatDateRange()}</span>
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  clearDates();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
          </div>
          
          {showCalendar && (
            <div className="absolute z-10 mt-2 bg-white shadow-lg rounded-md p-4">
              <DatePicker
                selected={startDate}
                onChange={(dates) => {
                  const [start, end] = dates as [Date, Date];
                  setStartDate(start);
                  setEndDate(end);
                  if (start && end) {
                    setShowCalendar(false);
                  }
                }}
                startDate={startDate}
                endDate={endDate}
                selectsRange
                inline
                monthsShown={2}
                dateFormat="dd/MM/yyyy"
              />
            </div>
          )}
        </div>
        
        {(startDate || endDate) && (
          <div className="mt-2 text-sm text-brmania-green">
            Filtrando produtos com vencimento entre {startDate?.toLocaleDateString('pt-BR')} e {endDate?.toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-brmania-accent">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Produtos Vencidos</h3>
              <p className="text-3xl font-bold text-brmania-accent mt-2">{stats.expired}</p>
            </div>
            <FaExclamationTriangle className="text-3xl text-brmania-accent opacity-70" />
          </div>
          
          {stats.expired > 0 && (
            <button
              onClick={handleDeleteExpiredProducts}
              disabled={isDeleting}
              className="mt-3 flex items-center text-sm text-brmania-accent hover:underline font-medium"
            >
              <FaTrashAlt className="mr-1" />
              {isDeleting ? 'Excluindo...' : 'Excluir todos os vencidos'}
            </button>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Vencendo em 7 dias</h3>
              <p className="text-3xl font-bold text-orange-500 mt-2">{stats.expiringIn7}</p>
            </div>
            <FaCalendarWeek className="text-3xl text-orange-500 opacity-70" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-brmania-yellow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-brmania-dark">Vencendo em 30 dias</h3>
              <p className="text-3xl font-bold text-brmania-yellow mt-2">{stats.expiringIn30}</p>
            </div>
            <FaCalendarAlt className="text-3xl text-brmania-yellow opacity-70" />
          </div>
        </div>
      </div>

      {/* Seleção de relatório */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold text-brmania-dark mb-4 flex items-center">
          <FaFilePdf className="mr-2 text-brmania-green" /> Gerar Relatórios
        </h3>
        <div>
          <p className="text-gray-600 mb-4">
            Selecione o tipo de relatório que deseja gerar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <button
              onClick={() => setSelectedReportType('all')}
              className={`p-3 rounded-lg flex flex-col items-center transition-colors ${
                selectedReportType === 'all' 
                  ? 'bg-brmania-green text-white' 
                  : 'bg-gray-100 text-brmania-dark hover:bg-brmania-green/10'
              }`}
            >
              <FaChartBar className="text-xl mb-2" />
              <span>Todos os Produtos</span>
              <span className="text-sm mt-1 font-semibold">{stats.total}</span>
            </button>
            <button
              onClick={() => setSelectedReportType('expired')}
              className={`p-3 rounded-lg flex flex-col items-center transition-colors ${
                selectedReportType === 'expired' 
                  ? 'bg-brmania-accent text-white' 
                  : 'bg-gray-100 text-brmania-dark hover:bg-brmania-accent/10'
              }`}
            >
              <FaExclamationCircle className="text-xl mb-2" />
              <span>Produtos Vencidos</span>
              <span className="text-sm mt-1 font-semibold">{stats.expired}</span>
            </button>
            <button
              onClick={() => setSelectedReportType('expiring7')}
              className={`p-3 rounded-lg flex flex-col items-center transition-colors ${
                selectedReportType === 'expiring7' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-brmania-dark hover:bg-orange-100'
              }`}
            >
              <FaCalendarWeek className="text-xl mb-2" />
              <span>Vencendo em 7 dias</span>
              <span className="text-sm mt-1 font-semibold">{stats.expiringIn7}</span>
            </button>
            <button
              onClick={() => setSelectedReportType('expiring30')}
              className={`p-3 rounded-lg flex flex-col items-center transition-colors ${
                selectedReportType === 'expiring30' 
                  ? 'bg-brmania-yellow text-brmania-dark' 
                  : 'bg-gray-100 text-brmania-dark hover:bg-brmania-yellow/20'
              }`}
            >
              <FaCalendarAlt className="text-xl mb-2" />
              <span>Vencendo em 30 dias</span>
              <span className="text-sm mt-1 font-semibold">{stats.expiringIn30}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={!selectedReportType || filteredProducts.length === 0}
              className={`flex items-center px-4 py-2 rounded-lg ${
                !selectedReportType || filteredProducts.length === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-brmania-green text-white hover:bg-brmania-green/90'
              }`}
            >
              <FaFileExcel className="mr-2" />
              Exportar para Excel
            </button>
            <button
              onClick={handleGeneratePdfReport}
              disabled={!selectedReportType || filteredProducts.length === 0}
              className={`flex items-center px-4 py-2 rounded-lg ${
                !selectedReportType || filteredProducts.length === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-brmania-green text-white hover:bg-brmania-green/90'
              }`}
            >
              <FaFilePdf className="mr-2" />
              Exportar para PDF
            </button>
          </div>
        </div>
      </div>

      {/* Prévia */}
      {selectedReportType && filteredProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-brmania-dark mb-4">
            Prévia: {getReportTitle()}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-brmania-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Código de Barras</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-brmania-dark uppercase tracking-wider">Validade</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-brmania-light/50">
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark font-medium">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark">{product.categories?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark font-mono">{product.barcode || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-brmania-dark">
                      {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Total de {filteredProducts.length} produto(s)
          </p>
        </div>
      )}

      {/* Diálogo de confirmação */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center text-brmania-accent mb-4">
              <FaExclamationTriangle className="text-2xl mr-2" />
              <h3 className="text-xl font-bold">Confirmar exclusão</h3>
            </div>
            <p className="mb-6">
              Você está prestes a excluir <span className="font-bold">{stats.expired}</span> produtos vencidos. 
              Esta ação não pode ser desfeita. Deseja continuar?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports 

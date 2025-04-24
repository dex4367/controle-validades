import React, { useState, useEffect } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/supabase'

const CategoriesManager = () => {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<{ id: number, name: string } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data || [])
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      showNotification('error', 'Erro ao carregar categorias.')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({
      show: true,
      type,
      message
    })

    // Esconder notificação após 3 segundos
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCategoryName.trim()) {
      showNotification('error', 'O nome da categoria é obrigatório.')
      return
    }
    
    try {
      await createCategory(newCategoryName)
      setNewCategoryName('')
      showNotification('success', 'Categoria criada com sucesso!')
      fetchCategories()
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      showNotification('error', 'Erro ao criar categoria.')
    }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingCategory) return
    
    if (!editingCategory.name.trim()) {
      showNotification('error', 'O nome da categoria é obrigatório.')
      return
    }
    
    try {
      await updateCategory(editingCategory.id, editingCategory.name)
      setEditingCategory(null)
      showNotification('success', 'Categoria atualizada com sucesso!')
      fetchCategories()
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
      showNotification('error', 'Erro ao atualizar categoria.')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    // Preparar para exclusão
    setCategoryToDelete(id)
    setShowConfirmDialog(true)
  }

  // Executar a exclusão após confirmação
  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteCategory(categoryToDelete);
      showNotification('success', 'Categoria excluída com sucesso!');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      showNotification('error', 'Erro ao excluir categoria. Verifique se ela está sendo usada por algum produto.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
      setCategoryToDelete(null);
    }
  };

  // Fechar diálogo de confirmação
  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setCategoryToDelete(null);
  };

  if (loading) {
    return <div className="text-center p-6">Carregando categorias...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Gerenciar Categorias</h2>

      {/* Diálogo de confirmação para excluir categoria */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-center text-gray-800 mb-1">Confirmar exclusão</h3>
            <p className="text-center text-gray-600 mb-4">
              Tem certeza que deseja excluir esta categoria? Esta ação pode afetar os produtos associados a ela.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Excluindo...
                  </>
                ) : (
                  'Sim, excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificação */}
      {notification.show && (
        <div className={`p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {notification.message}
        </div>
      )}

      {/* Formulário para adicionar nova categoria */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Adicionar Nova Categoria</h3>
        
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Categoria
            </label>
            <input
              type="text"
              id="newCategory"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Digite o nome da nova categoria"
            />
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Adicionar Categoria
          </button>
        </form>
      </div>

      {/* Lista de categorias existentes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Categorias Existentes</h3>
        
        {categories.length === 0 ? (
          <p className="text-gray-500 italic">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory && editingCategory.id === category.id ? (
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingCategory && editingCategory.id === category.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateCategory}
                            className="text-green-600 hover:text-green-900"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-4">
                          <button
                            onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Informações adicionais */}
      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Observações importantes:</h4>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc pl-5">
          <li>A exclusão de uma categoria pode afetar os produtos associados a ela.</li>
          <li>Produtos com categorias excluídas precisarão ser reclassificados.</li>
          <li>Recomenda-se editar o nome em vez de excluir uma categoria em uso.</li>
        </ul>
      </div>
    </div>
  )
}

export default CategoriesManager 
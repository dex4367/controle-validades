import { createClient } from '@supabase/supabase-js'

// Configurar Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xlqxzgurlnxrnlprlrbw.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhscXh6Z3VybG54cm5scHJscmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0NDQ4MjUsImV4cCI6MjA2MTAyMDgyNX0.OShVB-J-doJbBqna_0nxyb9w0vJebSWKjm1lAMOkJTE'
const supabase = createClient(supabaseUrl, supabaseKey)

// Tipo para produtos
export interface Product {
  id: number
  name: string
  barcode?: string
  category_id: number
  expiry_date: string
  image_url?: string
  created_at: string
  categories?: {
    id: number
    name: string
  }
}

// Tipo para histórico de nomes de produtos
export interface ProductNameHistory {
  id: number
  name: string
  barcode?: string
  created_at: string
}

// ========== PRODUTOS ==========

// Buscar todos os produtos
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (id, name)
    `)
    .order('name')
  
  if (error) {
    console.error('Erro ao buscar produtos:', error)
    throw error
  }
  
  return data || []
}

// Buscar um produto por ID
export const getProduct = async (id: number): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (id, name)
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    console.error(`Erro ao buscar produto ${id}:`, error)
    throw error
  }
  
  return data
}

// Buscar um produto por código de barras
export const getProductByBarcode = async (barcode: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (id, name)
    `)
    .eq('barcode', barcode)
    .order('expiry_date') // Ordenar por data de validade (mais recentes primeiro)
    .limit(1)
  
  if (error) {
    console.error(`Erro ao buscar produto pelo código de barras ${barcode}:`, error)
    throw error
  }
  
  return data && data.length > 0 ? data[0] : null
}

// Buscar todos os produtos com o mesmo código de barras
export const getProductsByBarcode = async (barcode: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories:category_id (id, name)
    `)
    .eq('barcode', barcode)
    .order('expiry_date', { ascending: false }) // Ordenar por data de validade (mais recentes primeiro)
  
  if (error) {
    console.error(`Erro ao buscar produtos pelo código de barras ${barcode}:`, error)
    throw error
  }
  
  return data || []
}

// Criar um novo produto
export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
  
  if (error) {
    console.error('Erro ao criar produto:', error)
    throw error
  }
  
  return data![0]
}

// Atualizar um produto existente
export const updateProduct = async (id: number, productData: Partial<Product>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error(`Erro ao atualizar produto ${id}:`, error)
    throw error
  }
  
  return data![0]
}

// Salvar nome do produto no histórico
export const saveProductNameToHistory = async (name: string, barcode?: string): Promise<void> => {
  try {
    // Verificar se o nome já existe no histórico
    const { data: existingNames } = await supabase
      .from('product_names_history')
      .select('name')
      .eq('name', name)
      .limit(1);

    // Se o nome já existe, não é necessário salvar novamente
    if (existingNames && existingNames.length > 0) {
      return;
    }
    
    // Salvar o nome no histórico
    const { error } = await supabase
      .from('product_names_history')
      .insert([{ name, barcode }]);
    
    if (error) {
      console.error('Erro ao salvar nome do produto no histórico:', error);
    }
  } catch (error) {
    console.error('Erro ao processar histórico de nomes:', error);
  }
}

// Buscar histórico de nomes de produtos para autocomplete
export const getProductNameSuggestions = async (query: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('product_names_history')
      .select('name')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10);
    
    if (error) {
      console.error('Erro ao buscar sugestões de nomes de produtos:', error);
      return [];
    }
    
    return data ? data.map(item => item.name) : [];
  } catch (error) {
    console.error('Erro ao buscar sugestões de nomes:', error);
    return [];
  }
}

// Excluir um produto (modificada para salvar o nome antes)
export const deleteProduct = async (id: number): Promise<void> => {
  try {
    // Primeiro, obtém os dados do produto
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('name, barcode')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Erro ao buscar produto ${id} para exclusão:`, fetchError);
      throw fetchError;
    }
    
    // Salva o nome no histórico
    if (product) {
      await saveProductNameToHistory(product.name, product.barcode);
    }
    
    // Exclui o produto
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir produto ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Erro no processo de exclusão do produto ${id}:`, error);
    throw error;
  }
}

// Upload de imagem do produto
export const uploadProductImage = async (file: File, productId: number): Promise<string> => {
  // Criar um nome único para o arquivo
  const fileExt = file.name.split('.').pop()
  const fileName = `${productId}_${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `product-images/${fileName}`
  
  // Fazer upload do arquivo
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file)
  
  if (uploadError) {
    console.error('Erro ao fazer upload da imagem:', uploadError)
    throw uploadError
  }
  
  // Obter a URL pública da imagem
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// ========== CATEGORIAS ==========

// Buscar todas as categorias
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Erro ao buscar categorias:', error)
    throw error
  }
  
  return data || []
}

// Criar uma nova categoria
export const createCategory = async (name: string) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name }])
    .select()
  
  if (error) {
    console.error('Erro ao criar categoria:', error)
    throw error
  }
  
  return data![0]
}

// Atualizar uma categoria existente
export const updateCategory = async (id: number, name: string) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
  
  if (error) {
    console.error(`Erro ao atualizar categoria ${id}:`, error)
    throw error
  }
  
  return data![0]
}

// Excluir uma categoria
export const deleteCategory = async (id: number) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error(`Erro ao excluir categoria ${id}:`, error)
    throw error
  }
}

// Buscar histórico de produtos por código de barras
export const getProductHistoryByBarcode = async (barcode: string): Promise<ProductNameHistory | null> => {
  try {
    const { data, error } = await supabase
      .from('product_names_history')
      .select('*')
      .eq('barcode', barcode)
      .limit(1);
    
    if (error) {
      console.error(`Erro ao buscar histórico de produto pelo código de barras ${barcode}:`, error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`Erro ao processar busca de histórico por código de barras ${barcode}:`, error);
    return null;
  }
} 
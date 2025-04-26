// Serviço para a API do Open Food Facts

// Interface para os resultados da API do Open Food Facts
export interface OpenFoodFactsProduct {
  product_name: string;
  product_name_pt?: string;
  brands?: string;
  quantity?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_front_thumb_url?: string;
  image_thumb_url?: string;
  selected_images?: {
    front?: {
      display?: { [key: string]: string };
      small?: { [key: string]: string };
      thumb?: { [key: string]: string };
    };
    ingredients?: {
      display?: { [key: string]: string };
      small?: { [key: string]: string };
      thumb?: { [key: string]: string };
    };
    nutrition?: {
      display?: { [key: string]: string };
      small?: { [key: string]: string };
      thumb?: { [key: string]: string };
    };
    packaging?: {
      display?: { [key: string]: string };
      small?: { [key: string]: string };
      thumb?: { [key: string]: string };
    };
  };
  images?: {
    front?: { [key: string]: string };
    ingredients?: { [key: string]: string };
    nutrition?: { [key: string]: string };
    packaging?: { [key: string]: string };
  };
  status: number;
  status_verbose: string;
}

// Interface para a resposta da API do Open Food Facts
interface OpenFoodFactsResponse {
  code: string;
  product: OpenFoodFactsProduct;
  status: number;
  status_verbose: string;
}

/**
 * Busca um produto pelo código de barras na API do Open Food Facts
 * @param barcode - Código de barras do produto
 * @returns Informações do produto ou null se não for encontrado
 */
export const fetchProductFromOpenFoodFacts = async (barcode: string): Promise<OpenFoodFactsProduct | null> => {
  try {
    // URL da API do Open Food Facts
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    
    console.log('🔍 Consultando API do Open Food Facts:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, response.statusText);
      return null;
    }
    
    const data: OpenFoodFactsResponse = await response.json();
    
    console.log('✅ Resposta da API do Open Food Facts status:', data.status);
    console.log('🏷️ Produto encontrado:', data.product ? 'Sim' : 'Não');
    
    if (data.product && data.product.product_name) {
      console.log('📦 Nome do produto:', data.product.product_name);
      console.log('📦 Nome do produto em PT:', data.product.product_name_pt || 'Não disponível');
    }
    
    // Verifica se a API encontrou o produto
    if (data.status === 1 && data.product) {
      return data.product;
    }
    
    return null;
  } catch (error) {
    console.error('🛑 Erro ao buscar produto na API do Open Food Facts:', error);
    return null;
  }
};

/**
 * Obtém o nome do produto baseado na resposta da API do Open Food Facts
 * @param product - Produto retornado pela API
 * @returns Nome do produto mais adequado para o contexto brasileiro
 */
export const getProductName = (product: OpenFoodFactsProduct | null): string => {
  if (!product) return '';
  
  // Preferência ao nome em português quando disponível
  if (product.product_name_pt) {
    return product.product_name_pt;
  }
  
  // Caso contrário, retorna o nome padrão
  return product.product_name || '';
};

/**
 * Obtém a URL da imagem do produto baseado na resposta da API do Open Food Facts
 * @param product - Produto retornado pela API
 * @returns URL da imagem do produto ou string vazia se não disponível
 */
export const getProductImage = (product: OpenFoodFactsProduct | null): string => {
  if (!product) return '';
  
  console.log('Produto recebido para imagem:', JSON.stringify(product, null, 2));
  
  // Tenta obter a melhor imagem disponível
  if (product.image_front_url) {
    console.log('Usando image_front_url:', product.image_front_url);
    return product.image_front_url;
  }
  
  if (product.image_url) {
    console.log('Usando image_url:', product.image_url);
    return product.image_url;
  }
  
  if (product.image_front_small_url) {
    console.log('Usando image_front_small_url:', product.image_front_small_url);
    return product.image_front_small_url;
  }
  
  if (product.image_front_thumb_url) {
    console.log('Usando image_front_thumb_url:', product.image_front_thumb_url);
    return product.image_front_thumb_url;
  }
  
  if (product.image_thumb_url) {
    console.log('Usando image_thumb_url:', product.image_thumb_url);
    return product.image_thumb_url;
  }
  
  // Tentar obter de selected_images
  if (product.selected_images?.front?.display?.pt) {
    console.log('Usando selected_images.front.display.pt');
    return product.selected_images.front.display.pt;
  }
  
  if (product.selected_images?.front?.display?.en) {
    console.log('Usando selected_images.front.display.en');
    return product.selected_images.front.display.en;
  }
  
  if (product.selected_images?.front?.small?.pt) {
    console.log('Usando selected_images.front.small.pt');
    return product.selected_images.front.small.pt;
  }
  
  if (product.selected_images?.front?.small?.en) {
    console.log('Usando selected_images.front.small.en');
    return product.selected_images.front.small.en;
  }
  
  if (product.selected_images?.front?.thumb?.pt) {
    console.log('Usando selected_images.front.thumb.pt');
    return product.selected_images.front.thumb.pt;
  }
  
  if (product.selected_images?.front?.thumb?.en) {
    console.log('Usando selected_images.front.thumb.en');
    return product.selected_images.front.thumb.en;
  }
  
  // Tentar obter de images
  if (product.images?.front?.display) {
    console.log('Usando images.front.display');
    return product.images.front.display;
  }
  
  console.log('Nenhuma imagem encontrada para o produto');
  return '';
}; 
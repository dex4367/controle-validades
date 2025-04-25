-- Criar tabela de histórico de nomes de produtos
CREATE TABLE IF NOT EXISTS product_names_history (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);

-- Criar índice para acelerar buscas por nome
CREATE INDEX IF NOT EXISTS product_names_history_name_idx ON product_names_history (name);

-- Criar índice para busca com ILIKE (autocomplete)
CREATE INDEX IF NOT EXISTS product_names_history_name_trgm_idx ON product_names_history USING gin (name gin_trgm_ops);

-- Certifique-se de que a extensão pg_trgm está instalada (necessária para o índice acima)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Função para preencher o histórico com nomes existentes
INSERT INTO product_names_history (name, barcode)
SELECT DISTINCT name, barcode 
FROM products 
WHERE name IS NOT NULL
ON CONFLICT (name) DO NOTHING; 
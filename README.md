# Sistema de Controle de Validades

Um sistema web para gerenciar e controlar datas de validade de produtos em lojas de conveniência.

## Funcionalidades

- 📋 Cadastro completo de produtos com categorias
- 📅 Controle de datas de validade
- 🖼️ Upload de imagens de produtos
- 📊 Geração de relatórios em formato Excel
- 🔍 Suporte para leitores de código de barras USB
- 📱 Interface responsiva (desktop e mobile)

## Tecnologias Utilizadas

- React + TypeScript (Frontend)
- Supabase (Backend e banco de dados)
- Tailwind CSS (Estilização)
- ZXing/library (Leitura de códigos de barras)
- XLSX (Geração de relatórios Excel)

## Pré-requisitos

- Node.js (v18 ou superior)
- NPM ou Yarn
- Conta no Supabase (para o banco de dados)
- Leitor de código de barras USB (opcional)

## Configuração

1. Clone o repositório
```bash
git clone [URL_DO_REPOSITÓRIO]
cd control-validades
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env` (crie o arquivo na raiz do projeto)
```
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_KEY=sua_chave_anon_do_supabase
```

4. Execute o projeto em modo de desenvolvimento
```bash
npm run dev
```

## Estrutura do Banco de Dados (Supabase)

### Tabelas

#### Produtos (`products`)
- `id` (PK, auto-incremento)
- `name` (text, not null)
- `barcode` (text)
- `category_id` (FK para categories.id)
- `expiry_date` (date, not null)
- `image_url` (text)
- `created_at` (timestamp with timezone, default: now())

#### Categorias (`categories`)
- `id` (PK, auto-incremento)
- `name` (text, not null)
- `created_at` (timestamp with timezone, default: now())

### Scripts SQL para criar as tabelas

```sql
-- Tabela de categorias
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  category_id INTEGER REFERENCES categories(id),
  expiry_date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX products_category_id_idx ON products(category_id);
CREATE INDEX products_expiry_date_idx ON products(expiry_date);
CREATE INDEX products_barcode_idx ON products(barcode);
```

## Uso de Leitores de Código de Barras

O sistema suporta a utilização de leitores de código de barras USB. Algumas considerações importantes:

1. **Compatibilidade**: O sistema funciona com qualquer leitor de código de barras que simule entradas de teclado (a maioria dos leitores USB).
2. **Configuração**: Não é necessária nenhuma configuração especial - basta conectar o leitor USB ao computador.
3. **Uso**: Ao utilizar o leitor, certifique-se de que o cursor esteja posicionado no campo de código de barras.

## Suporte

Para suporte, entre em contato através do e-mail: [seu-email@exemplo.com] 
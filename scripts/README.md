# Scripts de Configuração do Banco de Dados

Este diretório contém scripts para configuração e manutenção do banco de dados.

## Histórico de Nomes de Produtos

O sistema agora mantém um histórico de nomes de produtos mesmo após sua exclusão. 
Isso permite:

1. Autocompletar nomes de produtos ao cadastrar novos itens
2. Manter uma base de conhecimento de produtos previamente cadastrados
3. Facilitar a consistência na nomenclatura de produtos

### Instalação

Para configurar esta funcionalidade, você precisa executar o script SQL no Supabase:

1. Acesse o painel de administração do Supabase
2. Vá para a seção "SQL Editor"
3. Crie uma nova query
4. Cole o conteúdo do arquivo `create_product_names_history.sql`
5. Execute a query

Isso irá:
- Criar a tabela `product_names_history`
- Configurar os índices necessários
- Preencher a tabela com os nomes de produtos existentes

### Como funciona

Quando um produto é excluído, seu nome é automaticamente salvo na tabela `product_names_history`.
Ao digitar o nome de um novo produto, o sistema sugere nomes previamente utilizados.

Esta funcionalidade não afeta a exclusão normal de produtos - apenas mantém um registro dos nomes utilizados para referência futura. 
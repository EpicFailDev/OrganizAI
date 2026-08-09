import { Hono } from 'hono';

const llmsApp = new Hono();

const llmsTxtContent = `# OrganizAI API
> Sistema de gestão financeira familiar e precificação inteligente.

## Visão Geral
OrganizAI é uma plataforma modular com backend REST documentado em OpenAPI 3.0.
A API permite integrar agentes de inteligência artificial (MCP), aplicações móveis e o dashboard web React.

## Autenticação
Todas as rotas /v1/* exigem um token JWT do Supabase Auth:
\`\`\`
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
\`\`\`
As políticas RLS (Row Level Security) do banco escopam os dados por família/usuário.

## Endpoints Principais
- GET /healthz - Status do servidor backend
- GET /v1/profile/{userId} - Perfil do usuário
- PATCH /v1/profile/{userId} - Atualiza nome/profissão do perfil
- GET /v1/me/family - Família do usuário logado
- GET /v1/family/{familyId}/members - Integrantes do grupo
- POST /v1/family - Cria um novo grupo familiar
- POST /v1/family/join - Entra via código de convite
- GET /v1/transactions - Lista lançamentos financeiros
- POST /v1/transactions - Cadastra receita ou despesa
- PATCH /v1/transactions/{id} - Atualiza um lançamento
- DELETE /v1/transactions/{id} - Remove lançamento por UUID
- GET /v1/categories - Lista categorias financeiras
- POST /v1/categories - Cria categoria personalizada
- GET /v1/subcategories - Lista subcategorias
- GET /v1/analytics/summary - Resumo de receitas, despesas e saldo
- GET /v1/goals - Lista metas financeiras
- GET /v1/budgets - Lista orçamentos por categoria
- GET /v1/planning-items - Lista itens de planejamento
- GET /v1/products - Lista produtos (precificação/vendas)
- GET /v1/sales - Lista vendas registradas
- GET /v1/pricing-recipes - Lista receitas da ficha técnica
- GET /v1/ingredients - Lista ingredientes base

## Endpoints de IA
- GET /doc - Documentação visual interativa via Scalar
- GET /doc/json - Especificação OpenAPI 3.0 em JSON
- GET /mcp.json - Configuração do servidor MCP (Streamable HTTP)
- POST /mcp - Endpoint MCP (Model Context Protocol) para Agentes de IA

## Documentação Completa
Para detalhes de schemas, consulte [/llms-full.txt](/llms-full.txt) ou [/doc/json](/doc/json).
`;

const llmsFullTxtContent = `# OrganizAI API - Especificação Completa para LLMs

## Arquitetura
- Backend: Hono.js + Node.js + TypeScript (apps/api)
- Frontend: React + Vite (apps/web)
- Banco de Dados: Supabase PostgreSQL (com RLS por family_id)
- Formato de troca: JSON
- Autenticação: Supabase JWT via header \`Authorization: Bearer <token>\`

## Schema de Autenticação
\`\`\`http
GET /v1/me/family HTTP/1.1
Host: doc.organizai.duckdns.org
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Accept: application/json
\`\`\`

## Schemas dos Dados (Zod / TypeScript)

### Transaction (Transação Financeira)
\`\`\`typescript
interface Transaction {
  id: string; // UUID
  family_id: string;
  description: string; // Ex: "Supermercado"
  amount: number; // Ex: 150.50
  type: 'expense' | 'income' | 'transfer';
  category_id?: string | null;
  subcategory_id?: string | null;
  date: string; // ISO Date YYYY-MM-DD
  created_by: string; // UUID do usuário
  attachment_url?: string | null;
  notes?: string | null;
  categories?: { name: string; color?: string } | null;
  receipt_items?: ReceiptItem[] | null;
}
\`\`\`

### Category (Categoria Financeira)
\`\`\`typescript
interface Category {
  id: string; // UUID
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
  icon?: string | null;
  family_id?: string | null; // null = global padrão
}
\`\`\`

### Goal (Meta Financeira)
\`\`\`typescript
interface Goal {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  status: 'active' | 'completed' | 'cancelled';
}
\`\`\`

### Budget (Orçamento)
\`\`\`typescript
interface Budget {
  id: string;
  family_id: string;
  category_id: string;
  limit_amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
}
\`\`\`

### PlanningItem (Planejamento)
\`\`\`typescript
interface PlanningItem {
  id: string;
  family_id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id?: string | null;
  expected_date: string;
  recurring?: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
}
\`\`\`

### Product / Sale (Vendas)
\`\`\`typescript
interface Product {
  id: string;
  family_id: string;
  name: string;
  selling_price?: number | null;
  cost_price?: number | null;
  unit?: string | null;
}

interface Sale {
  id: string;
  family_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  profit?: number | null;
  sale_date: string;
}
\`\`\`

### PricingRecipe / RecipeItem (Ficha Técnica)
\`\`\`typescript
interface PricingRecipe {
  id: string;
  family_id: string;
  name: string;
  yield_quantity: number;
  packaging_cost: number;
  notes?: string | null;
}

interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  package_grams?: number;
  package_cost?: number;
  used_grams?: number;
}
\`\`\`

### FinancialSummary (Resumo Financeiro)
\`\`\`typescript
interface FinancialSummary {
  total_expenses: number;
  total_income: number;
  net_balance: number;
  transactions_count: number;
}
\`\`\`

## Servidor MCP (Model Context Protocol)
O backend expõe um servidor MCP em dois transportes:

### 1. HTTP Streamable (recomendado para agentes remotos)
- Endpoint: \`POST /mcp\` (e \`GET\` para SSE)
- Configuração para o cliente: \`https://doc.organizai.duckdns.org/mcp\`
- Descoberta: \`GET /mcp.json\`

### 2. STDIO (execução local)
- Executável via \`npm run mcp\` no diretório \`apps/api\`.

### Ferramentas (tools) disponíveis
1. \`get_financial_summary\`: Consulta balanço de entradas e saídas de uma família.
2. \`list_transactions\`: Lista os últimos lançamentos financeiros de uma família.
3. \`add_transaction\`: Cadastra uma nova receita ou despesa em uma família.
4. \`list_categories\`: Lista categorias globais e da família.

## Exemplo de Configuração MCP (Claude / Cursor)
\`\`\`json
{
  "mcpServers": {
    "organizai": {
      "type": "http",
      "url": "https://doc.organizai.duckdns.org/mcp",
      "headers": { "Authorization": "Bearer <SUPABASE_ACCESS_TOKEN>" }
    }
  }
}
\`\`\`
`;

llmsApp.get('/llms.txt', (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(llmsTxtContent);
});

llmsApp.get('/llms-full.txt', (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(llmsFullTxtContent);
});

export default llmsApp;

# Plano: Aba de Vendas para Jennifer

## Objetivo
Criar uma aba de vendas profissional para a Jennifer (vendedora) com visual similar às planilhas Excel que ela utiliza no dia a dia, incluindo:
1. **Calculadora de Precificação** (igual ao Excel)
2. **Lista de Produtos Cadastrados**
3. **Registro de Vendas**
4. **Relatório de Lucro**

## Análise das Imagens de Referência

### TABELA 1 - BASE (Custo dos Ingredientes)
- Cabeçalho rosa/vermelho: "Custo dos Ingredientes $"
- Colunas: (A) Ingrediente | (B) Quantidade em gramas da embalagem fechada | (C) Custo
- Fundo branco com linhas tracejadas
- Instruções no topo

### TABELA 2 (Calculadora de Precificação)
- Cabeçalho rosa/vermelho: "Calculadora de Precificação"
- Subtítulo: "Complete somente as células em azul, a tabela faz o resto!"
- Seção: "RECEITA: Doguinho" | "precificado em: 15/1/22"
- Colunas da tabela principal:
  - Ingredientes (A) - células azuis (editáveis)
  - Custo dos Ingredientes (B) - automático
  - Quantas em Gramas da Embalagem Fechada (C) - automático
  - Gramas Utilizadas (D) - células azuis (editáveis)
  - Quanto Custou (E) - automático
- Seção "Contas Finais" (cálculos automáticos):
  - Total Custo de Ingredientes
  - Adiciona 25% (custos incalculáveis, gás, luz, etc)
  - Multiplica por 3 (seu lucro e mão de obra)
  - Rendimento / quantas unidades (F) - célula azul
  - Preço por Unidade
  - Preço por Embalagem Individual
  - Preço final de venda por unidade

## Arquitetura da Solução

### 1. Nova Tabela no Supabase: `pricing_recipes`
```sql
CREATE TABLE pricing_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Nome da receita (ex: "Doguinho")
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  yield_quantity INTEGER DEFAULT 1, -- Rendimento (quantas unidades)
  packaging_cost DECIMAL(10,2) DEFAULT 0, -- Custo embalagem individual
  notes TEXT
);

-- RLS
ALTER TABLE pricing_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_recipes" ON pricing_recipes
  FOR ALL USING (public.is_member_of_family(family_id));
```

### 2. Nova Tabela: `recipe_items`
```sql
CREATE TABLE recipe_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES pricing_recipes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL, -- Nome do ingrediente
  package_grams DECIMAL(10,2) DEFAULT 0, -- Gramas da embalagem fechada
  package_cost DECIMAL(10,2) DEFAULT 0, -- Custo da embalagem
  used_grams DECIMAL(10,2) DEFAULT 0, -- Gramas utilizadas na receita
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_recipe_items" ON recipe_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pricing_recipes pr
      WHERE pr.id = recipe_items.recipe_id
      AND public.is_member_of_family(pr.family_id)
    )
  );
```

### 3. Nova Tabela: `products` (Produtos Cadastrados)
```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  recipe_id UUID REFERENCES pricing_recipes(id), -- Receita base
  selling_price DECIMAL(10,2), -- Preço de venda sugerido
  cost_price DECIMAL(10,2), -- Custo calculado
  unit TEXT DEFAULT 'un', -- un, kg, etc
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_products" ON products
  FOR ALL USING (public.is_member_of_family(family_id));
```

### 4. Nova Tabela: `sales` (Registro de Vendas)
```sql
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- Custo no momento da venda
  profit DECIMAL(10,2), -- Lucro calculado
  sale_date DATE DEFAULT CURRENT_DATE,
  sale_time TIME,
  customer_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_sales" ON sales
  FOR ALL USING (public.is_member_of_family(family_id));
```

### 5. Nova Tabela: `ingredients_base` (Tabela Base de Ingredientes)
```sql
CREATE TABLE ingredients_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  package_grams DECIMAL(10,2) NOT NULL,
  package_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ingredients_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_members_can_access_ingredients" ON ingredients_base
  FOR ALL USING (public.is_member_of_family(family_id));
```

## Componentes a Criar

### 1. `Vendas.tsx` - Componente Principal
**Localização:** `src/components/Vendas.tsx`

**Funcionalidades:**
- Dashboard com KPIs de vendas
- Navegação entre sub-abas: Calculadora | Produtos | Vendas | Relatórios
- Layout responsivo similar ao Uber99Dashboard

**Estrutura:**
```tsx
interface VendasProps {
  familyId: string;
  userId: string;
  transactions: Transaction[];
}

export const Vendas: React.FC<VendasProps> = ({
  familyId,
  userId,
  transactions
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'products' | 'sales' | 'reports'>('calculator');
  
  return (
    <div className="vendas-root">
      {/* Header */}
      {/* KPI Cards */}
      {/* Tab Navigation */}
      {/* Content based on activeTab */}
    </div>
  );
};
```

### 2. `PricingCalculator.tsx` - Calculadora de Precificação
**Localização:** `src/components/PricingCalculator.tsx`

**Funcionalidades:**
- Tabela de ingredientes editável (células azuis)
- Cálculos automáticos:
  - Custo por ingrediente = (Custo embalagem / Gramas embalagem) × Gramas utilizadas
  - Total custo ingredientes
  - Adição de 25% (custos fixos)
  - Multiplicação por 3 (lucro + mão de obra)
  - Preço por unidade
  - Preço por embalagem individual
  - Preço final de venda

**Visual (estilo Excel):**
```tsx
// Cabeçalho rosa/vermelho
<div style={{
  background: 'linear-gradient(135deg, #e91e63 0%, #f44336 100%)',
  padding: '1rem',
  borderRadius: '8px 8px 0 0',
  color: 'white',
  textAlign: 'center'
}}>
  <h2 style={{ margin: 0, fontStyle: 'italic' }}>
    ** Calculadora de Precificação **
  </h2>
</div>

// Instruções
<div style={{
  background: '#fff3e0',
  padding: '0.75rem',
  border: '2px dashed #ff9800',
  textAlign: 'center',
  fontSize: '0.9rem'
}}>
  Complete <strong style={{ color: '#2196f3' }}>somente</strong> as{' '}
  <span style={{ color: '#2196f3', fontWeight: 'bold' }}>células em azul</span>,
  a tabela faz o resto!
</div>

// Tabela com células azuis editáveis
<input
  type="number"
  style={{
    background: '#e3f2fd', // Azul claro
    border: '1px solid #2196f3',
    padding: '0.5rem',
    width: '100%',
    textAlign: 'center'
  }}
/>
```

### 3. `ProductsList.tsx` - Lista de Produtos
**Localização:** `src/components/ProductsList.tsx`

**Funcionalidades:**
- Grid de cards com produtos cadastrados
- Modal para cadastrar novo produto
- Selecionar receita base
- Preço de venda e custo calculado
- Status ativo/inativo

### 4. `SalesRegistry.tsx` - Registro de Vendas
**Localização:** `src/components/SalesRegistry.tsx`

**Funcionalidades:**
- Formulário para registrar venda
- Selecionar produto (com preço auto-preenchido)
- Quantidade × Preço unitário = Total
- Lucro calculado automaticamente
- Histórico de vendas do dia/semana/mês

### 5. `ProfitReport.tsx` - Relatório de Lucro
**Localização:** `src/components/ProfitReport.tsx`

**Funcionalidades:**
- Gráficos de lucro por produto (Recharts)
- Comparativo de períodos
- Margem de lucro por produto
- Top produtos mais lucrativos

## Integração com Navegação

### Atualizar `App.tsx`
```tsx
// Adicionar import lazy
const Vendas = lazy(() => import('./components/Vendas').then(m => ({ default: m.Vendas })));

// Adicionar ao VIEW_ORDER
const VIEW_ORDER: Record<string, number> = {
  // ... existente
  vendas: 1.5, // Logo após dashboard
};

// Adicionar ao renderViewFor
{v === 'vendas' && (
  <Vendas
    familyId={familyId || ''}
    userId={session.user.id}
    transactions={transactions}
  />
)}
```

### Atualizar `Sidebar.tsx`
```tsx
// Na seção professionItems
if (profession === 'vendedor') {
  professionItems.push(
    { id: 'salgados', name: 'Salgados (Vendas)', icon: <Store size={18} /> },
    { id: 'vendas', name: 'Calculadora', icon: <Calculator size={18} /> }
  );
}
```

### Atualizar `MobileTabBar.tsx`
```tsx
// Na seção professionTabs
if (profession === 'vendedor') {
  professionTabs.push(
    { id: 'transactions-salgados', label: 'Salgados', icon: Store },
    { id: 'vendas', label: 'Precificar', icon: Calculator }
  );
}
```

## Estilos CSS (estilo Excel)

### Paleta de Cores
```css
/* Cores inspiradas no Excel */
--excel-pink: #e91e63;
--excel-pink-light: #fce4ec;
--excel-red: #f44336;
--excel-blue: #2196f3;
--excel-blue-light: #e3f2fd;
--excel-green: #4caf50;
--excel-green-light: #e8f5e9;
--excel-orange: #ff9800;
--excel-orange-light: #fff3e0;
--excel-gray: #9e9e9e;
--excel-gray-light: #f5f5f5;
```

### Classe para Células Editáveis
```css
.excel-input-cell {
  background: var(--excel-blue-light);
  border: 1px solid var(--excel-blue);
  padding: 0.5rem;
  text-align: center;
  font-family: 'Arial', sans-serif;
  font-size: 0.9rem;
  border-radius: 2px;
  transition: all 0.2s;
}

.excel-input-cell:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
}

.excel-readonly-cell {
  background: var(--excel-gray-light);
  padding: 0.5rem;
  text-align: center;
  font-family: 'Arial', sans-serif;
  font-size: 0.9rem;
  border: 1px solid #ddd;
  border-radius: 2px;
}
```

### Classe para Cabeçalho
```css
.excel-header {
  background: linear-gradient(135deg, var(--excel-pink) 0%, var(--excel-red) 100%);
  color: white;
  padding: 1rem 1.5rem;
  text-align: center;
  font-style: italic;
  border-radius: 8px 8px 0 0;
}
```

## Fluxo de Dados

### Cálculo Automático da Calculadora
```tsx
const calculateIngredientCost = (item: RecipeItem) => {
  if (item.package_grams === 0 || item.used_grams === 0) return 0;
  const costPerGram = item.package_cost / item.package_grams;
  return costPerGram * item.used_grams;
};

const calculateFinalPrice = (items: RecipeItem[], yieldQty: number, packagingCost: number) => {
  // 1. Total custo ingredientes
  const totalIngredients = items.reduce((sum, item) => 
    sum + calculateIngredientCost(item), 0
  );
  
  // 2. Adiciona 25% (custos fixos)
  const withFixedCosts = totalIngredients * 1.25;
  
  // 3. Multiplica por 3 (lucro + mão de obra)
  const withProfit = withFixedCosts * 3;
  
  // 4. Preço por unidade
  const pricePerUnit = withProfit / (yieldQty || 1);
  
  // 5. Preço final (com embalagem)
  const finalPrice = pricePerUnit + packagingCost;
  
  return {
    totalIngredients,
    withFixedCosts,
    withProfit,
    pricePerUnit,
    finalPrice
  };
};
```

## Implementação Passo a Passo

### Fase 1: Banco de Dados (1-2 horas)
1. Criar migração SQL para as 4 novas tabelas
2. Criar RLS policies
3. Criar seed data com ingredientes base comuns

### Fase 2: Componente de Calculadora (3-4 horas)
1. Criar `PricingCalculator.tsx`
2. Implementar tabela editável
3. Implementar cálculos automáticos
4. Estilizar com visual Excel

### Fase 3: Integração (1-2 horas)
1. Atualizar `App.tsx` com nova rota
2. Atualizar `Sidebar.tsx` e `MobileTabBar.tsx`
3. Criar componente `Vendas.tsx` principal

### Fase 4: Funcionalidades Extras (2-3 horas)
1. Criar `ProductsList.tsx`
2. Criar `SalesRegistry.tsx`
3. Criar `ProfitReport.tsx`
4. Integrar com Supabase para persistência

### Fase 5: Testes e Ajustes (1-2 horas)
1. Testar cálculos
2. Testar responsividade
3. Ajustar estilos
4. Deploy

## Total Estimado: 8-13 horas de desenvolvimento

## Prioridade
1. **Calculadora de Precificação** (MVP) - Essencial para o dia a dia da Jennifer
2. **Lista de Produtos** - Para organizar o catálogo
3. **Registro de Vendas** - Para controle financeiro
4. **Relatório de Lucro** - Para análise de desempenho

## Notas Técnicas
- Seguir padrão de inline styles do projeto
- Usar `lucide-react` para ícones
- Usar `recharts` para gráficos do relatório
- Manter compatibilidade com tema dark existente
- Garantir responsividade (mobile-first)

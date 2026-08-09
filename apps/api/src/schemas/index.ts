import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Schemas Genéricos e Mensagens de Erro
// ----------------------------------------------------
export const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: 'Recurso não encontrado ou erro de autenticação' }),
}).openapi('ErrorResponse');

// Refs para colunas embutidas (joins) — tipam as listagens sem usar z.any().
export const CategoryRefSchema = z.object({
  name: z.string(),
  color: z.string().nullable().optional(),
}).nullable().optional();

export const SubcategoryRefSchema = z.object({
  name: z.string(),
}).nullable().optional();

export const ProfileRefSchema = z.object({
  display_name: z.string(),
}).nullable().optional();

export const ProductRefSchema = z.object({
  name: z.string(),
}).nullable().optional();

// ----------------------------------------------------
// Transação (Despesa / Receita)
// ----------------------------------------------------
// O banco só aceita 'expense' e 'income' (CHECK constraint da tabela).
export const TransactionTypeSchema = z.enum(['expense', 'income']).openapi('TransactionType');

// Colunas reais de public.transactions:
// id, family_id, date, description, category_id, subcategory_id, type,
// amount, created_by, attachment_url, created_at, time
export const TransactionSchema = z.object({
  id: z.string().uuid().openapi({ example: 'e3b0c442-98fc-11ee-b9d1-0242ac120002' }),
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  date: z.string().openapi({ example: '2026-08-08' }),
  description: z.string().openapi({ example: 'Supermercado Mensal' }),
  category_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  subcategory_id: z.string().uuid().nullable().optional(),
  type: TransactionTypeSchema,
  amount: z.number().openapi({ example: 450.75 }),
  created_by: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000002' }),
  attachment_url: z.string().nullable().optional(),
  time: z.string().nullable().optional().openapi({ example: '14:30:00' }),
  created_at: z.string().optional(),
}).openapi('Transaction');

export const CreateTransactionSchema = z.object({
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  description: z.string().min(1, 'Descrição é obrigatória').openapi({ example: 'Almoço de Domingo' }),
  amount: z.number().positive('O valor deve ser maior que zero').openapi({ example: 89.90 }),
  type: TransactionTypeSchema.default('expense'),
  category_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  subcategory_id: z.string().uuid().nullable().optional(),
  date: z.string().openapi({ example: '2026-08-08' }),
  time: z.string().nullable().optional().openapi({ example: '14:30:00' }),
  attachment_url: z.string().nullable().optional(),
}).openapi('CreateTransaction');

export const UpdateTransactionSchema = z.object({
  date: z.string().optional(),
  time: z.string().nullable().optional(),
  description: z.string().optional(),
  amount: z.number().positive('O valor deve ser maior que zero').optional(),
  type: TransactionTypeSchema.optional(),
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  attachment_url: z.string().nullable().optional(),
}).openapi('UpdateTransaction');

// Itens de recibo (referenciados pela listagem de transações).
export const ReceiptItemSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  family_id: z.string().uuid(),
  item_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  line_number: z.number().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('ReceiptItem');

export const TransactionListItemSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  date: z.string(),
  description: z.string(),
  category_id: z.string().uuid().nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  type: TransactionTypeSchema,
  amount: z.number(),
  created_by: z.string().uuid(),
  attachment_url: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
  subcategories: SubcategoryRefSchema,
  profiles: ProfileRefSchema,
  receipt_items: z.array(ReceiptItemSchema).optional(),
}).openapi('TransactionListItem');

// ----------------------------------------------------
// Categoria
// ----------------------------------------------------
// Colunas reais de public.categories:
// id, family_id, name, type, color, icon, created_at
export const CategorySchema = z.object({
  id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  name: z.string().openapi({ example: 'Alimentação' }),
  icon: z.string().nullable().optional().openapi({ example: 'Utensils' }),
  color: z.string().nullable().optional().openapi({ example: '#EF4444' }),
  type: z.enum(['income', 'expense']).openapi({ example: 'expense' }),
  family_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('Category');

export const CreateCategorySchema = z.object({
  name: z.string().min(1).openapi({ example: 'Supermercado' }),
  type: z.enum(['income', 'expense']).default('expense'),
  color: z.string().optional(),
  icon: z.string().optional(),
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
}).openapi('CreateCategory');

// ----------------------------------------------------
// Subcategoria
// ----------------------------------------------------
export const SubcategorySchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string(),
  created_at: z.string().optional(),
}).openapi('Subcategory');

export const CreateSubcategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
}).openapi('CreateSubcategory');

// ----------------------------------------------------
// Perfil e Família
// ----------------------------------------------------
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('Profile');

export const FamilyGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  invite_code: z.string().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('FamilyGroup');

export const FamilyMemberSchema = z.object({
  family_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: z.string(),
  joined_at: z.string(),
  profiles: z.object({
    display_name: z.string(),
    avatar_url: z.string().nullable().optional(),
  }).nullable().optional(),
}).openapi('FamilyMember');

export const MyFamilySchema = z.object({
  family_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  role: z.string(),
  joined_at: z.string(),
  family_groups: FamilyGroupSchema.nullable().optional(),
}).openapi('MyFamily');

// ----------------------------------------------------
// Orçamentos e Metas (colunas reais do banco)
// ----------------------------------------------------
export const BudgetSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  category_id: z.string().uuid(),
  limit_amount: z.number().openapi({ example: 1500.0 }),
  period: z.string().optional().default('monthly'),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
}).openapi('Budget');

export const CreateBudgetSchema = z.object({
  family_id: z.string().uuid(),
  category_id: z.string().uuid(),
  limit_amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional().default('monthly'),
}).openapi('CreateBudget');

export const GoalSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string().openapi({ example: 'Viagem de Fim de Ano' }),
  target_amount: z.number().openapi({ example: 5000.0 }),
  current_amount: z.number().openapi({ example: 2100.0 }),
  deadline: z.string().nullable().optional().openapi({ example: '2026-12-31' }),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
}).openapi('Goal');

export const CreateGoalSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  target_amount: z.number().positive(),
  deadline: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
}).openapi('CreateGoal');

export const UpdateGoalSchema = z.object({
  name: z.string().optional(),
  target_amount: z.number().optional(),
  current_amount: z.number().optional(),
  deadline: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
}).openapi('UpdateGoal');

// ----------------------------------------------------
// Planejamento
// ----------------------------------------------------
export const PlanningItemSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  description: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category_id: z.string().uuid().nullable().optional(),
  expected_date: z.string(),
  recurring: z.boolean().optional(),
  recurring_pattern: z.string().nullable().optional(),
  status: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
}).openapi('PlanningItem');

export const CreatePlanningItemSchema = z.object({
  family_id: z.string().uuid(),
  description: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category_id: z.string().uuid().nullable().optional(),
  expected_date: z.string(),
  recurring: z.boolean().optional().default(false),
  recurring_pattern: z.string().nullable().optional(),
}).openapi('CreatePlanningItem');

export const UpdatePlanningItemSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  expected_date: z.string().optional(),
}).openapi('UpdatePlanningItem');

// ----------------------------------------------------
// Ingredientes Base (Tabela de Precificação)
// ----------------------------------------------------
export const IngredientSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  package_grams: z.number(),
  package_cost: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).openapi('Ingredient');

export const CreateIngredientSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  package_grams: z.number().optional().default(0),
  package_cost: z.number().optional().default(0),
}).openapi('CreateIngredient');

export const UpdateIngredientSchema = z.object({
  name: z.string().optional(),
  package_grams: z.number().optional(),
  package_cost: z.number().optional(),
}).openapi('UpdateIngredient');

// ----------------------------------------------------
// Receitas de Precificação e Itens
// ----------------------------------------------------
export const PricingRecipeSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  yield_quantity: z.number().optional(),
  packaging_cost: z.number().optional(),
  notes: z.string().nullable().optional(),
}).openapi('PricingRecipe');

export const CreatePricingRecipeSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  yield_quantity: z.number().optional().default(10),
  packaging_cost: z.number().optional().default(0),
}).openapi('CreatePricingRecipe');

export const UpdatePricingRecipeSchema = z.object({
  name: z.string().optional(),
  yield_quantity: z.number().optional(),
  packaging_cost: z.number().optional(),
  notes: z.string().nullable().optional(),
}).openapi('UpdatePricingRecipe');

export const RecipeItemSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  ingredient_name: z.string(),
  package_grams: z.number().optional(),
  package_cost: z.number().optional(),
  used_grams: z.number().optional(),
  sort_order: z.number().optional(),
  created_at: z.string().optional(),
}).openapi('RecipeItem');

export const ReplaceRecipeItemsSchema = z.object({
  items: z.array(z.object({
    ingredient_name: z.string(),
    package_grams: z.number().optional().default(0),
    package_cost: z.number().optional().default(0),
    used_grams: z.number().optional().default(0),
    sort_order: z.number().optional().default(0),
  })),
}).openapi('ReplaceRecipeItems');

// ----------------------------------------------------
// Produtos e Vendas
// ----------------------------------------------------
export const ProductSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  recipe_id: z.string().uuid().nullable().optional(),
  selling_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  active: z.boolean().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
}).openapi('Product');

export const CreateProductSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  selling_price: z.number().nullable().optional(),
  unit: z.string().optional().default('un'),
}).openapi('CreateProduct');

export const UpdateProductSchema = z.object({
  name: z.string().optional(),
  selling_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  unit: z.string().optional(),
  active: z.boolean().optional(),
}).openapi('UpdateProduct');

export const SaleSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: z.string(),
  sale_time: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  products: ProductRefSchema,
}).openapi('Sale');

export const CreateSaleSchema = z.object({
  family_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number(),
  total_price: z.number(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: z.string(),
  sale_time: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
}).openapi('CreateSale');

export const UpdateSaleSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive().optional(),
  unit_price: z.number().optional(),
  total_price: z.number().optional(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: z.string().optional(),
  sale_time: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).openapi('UpdateSale');

// ----------------------------------------------------
// Itens de Recibo (receipt_items)
// ----------------------------------------------------
export const CreateReceiptItemSchema = z.object({
  transaction_id: z.string().uuid(),
  family_id: z.string().uuid(),
  item_name: z.string(),
  quantity: z.number().optional().default(1),
  unit_price: z.number().optional().default(0),
  total_price: z.number().optional().default(0),
  line_number: z.number().nullable().optional(),
}).openapi('CreateReceiptItem');

// ----------------------------------------------------
// Calculadora de Preços (Ficha Técnica de Produtos)
// ----------------------------------------------------
export const ProductPricingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: 'Bolo de Pote Ninho com Nutella' }),
  labor_hours: z.number().openapi({ example: 1.5 }),
  hourly_rate: z.number().openapi({ example: 25.0 }),
  desired_margin_percent: z.number().openapi({ example: 40.0 }),
  final_price: z.number().openapi({ example: 18.50 }),
  cost_total: z.number().openapi({ example: 8.20 }),
}).openapi('ProductPricing');

// ----------------------------------------------------
// Resumo Analítico / Insights
// ----------------------------------------------------
export const FinancialAnalyticsSummarySchema = z.object({
  total_expenses: z.number().openapi({ example: 3420.50 }),
  total_income: z.number().openapi({ example: 7500.00 }),
  net_balance: z.number().openapi({ example: 4079.50 }),
  top_category: z.string().nullable().openapi({ example: 'Alimentação' }),
  transactions_count: z.number().openapi({ example: 42 }),
  family_members_count: z.number().openapi({ example: 4 }),
}).openapi('FinancialAnalyticsSummary');

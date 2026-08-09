import { supabase } from '../supabaseClient';

/**
 * Cliente HTTP para a API REST do OrganizAI (apps/api).
 *
 * Injeta automaticamente o JWT da sessão do Supabase em cada requisição,
 * permitindo que o backend aplique as políticas RLS daquele usuário.
 *
 * A base URL é configurável via VITE_API_URL. Em produção (nginx) fica em
 * `/api` (mesma origem); em desenvolvimento, aponte para http://localhost:3000.
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export interface ApiResult<T> {
  data: T | null;
  error: any;
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    params?: Record<string, string | number | null | undefined>;
  } = {},
): Promise<ApiResult<T>> {
  const token = await getToken();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = new URL(API_BASE + path, window.location.origin);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  try {
    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return { data: null, error: new Error(json?.error || `Erro HTTP ${res.status}`) };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

const get = <T>(path: string, params?: Record<string, string | number | null | undefined>) =>
  request<T>(path, { params });
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body });
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ---------------------------------------------------------------
// Tipos (espelham as tabelas do Supabase)
// ---------------------------------------------------------------
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  profession?: string | null;
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code?: string | null;
}

export interface MyFamily {
  family_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  family_groups?: FamilyGroup | null;
}

export interface FamilyMember {
  family_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  profiles?: { display_name: string; avatar_url?: string } | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
  icon?: string | null;
  family_id?: string | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  date: string;
  description: string;
  category_id: string;
  subcategory_id?: string | null;
  type: 'income' | 'expense';
  amount: number;
  created_by: string;
  attachment_url?: string | null;
  created_at?: string;
  categories?: { name: string; color?: string | null } | null;
  subcategories?: { name: string } | null;
  profiles?: { display_name: string } | null;
  receipt_items?: ReceiptItem[] | null;
}

export interface ReceiptItem {
  id: string;
  transaction_id: string;
  family_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_number?: number | null;
}

export interface Budget {
  id: string;
  family_id: string;
  category_id: string;
  limit_amount: number;
  period: string;
  created_at?: string;
  categories?: { name: string; color?: string | null } | null;
}

export interface Goal {
  id: string;
  family_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string | null;
  icon?: string | null;
  color?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface PlanningItem {
  id: string;
  family_id: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category_id?: string | null;
  expected_date: string;
  recurring?: boolean;
  recurring_pattern?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_by?: string;
  created_at?: string;
  categories?: { name: string; color?: string | null } | null;
}

export interface Ingredient {
  id: string;
  family_id: string;
  name: string;
  package_grams: number;
  package_cost: number;
  created_at?: string;
  updated_at?: string;
}

export interface PricingRecipe {
  id: string;
  family_id: string;
  name: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string | null;
  yield_quantity: number;
  packaging_cost: number;
  notes?: string | null;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  package_grams?: number;
  package_cost?: number;
  used_grams?: number;
  sort_order?: number;
}

export interface Product {
  id: string;
  family_id: string;
  name: string;
  recipe_id?: string | null;
  selling_price?: number | null;
  cost_price?: number | null;
  unit?: string | null;
  active?: boolean | null;
}

export interface Sale {
  id: string;
  family_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price?: number | null;
  profit?: number | null;
  sale_date: string;
  sale_time?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  products?: { name: string } | null;
}

// ---------------------------------------------------------------
// Perfil e Família
// ---------------------------------------------------------------
export const api = {
  getProfile: (userId: string) => get<Profile>(`/v1/profile/${userId}`),
  updateProfile: (userId: string, body: Partial<{ display_name: string; profession: string | null }>) =>
    patch<Profile>(`/v1/profile/${userId}`, body),
  getMyFamily: () => get<MyFamily>('/v1/me/family'),
  getFamily: (familyId: string) => get<FamilyGroup>(`/v1/family/${familyId}`),
  getFamilyMembers: (familyId: string) => get<FamilyMember[]>(`/v1/family/${familyId}/members`),
  createFamily: (name: string) => post<{ family_id: string }>('/v1/family', { name }),
  joinFamily: (invite_code: string) => post<{ success: boolean }>('/v1/family/join', { invite_code }),
  leaveFamily: (familyId: string, profileId: string) =>
    del<{ success: boolean }>(`/v1/family/${familyId}/members/${profileId}`),

  // ---------------------------------------------------------------
  // Categorias e Subcategorias
  // ---------------------------------------------------------------
  listCategories: () => get<Category[]>('/v1/categories'),
  createCategory: (body: { name: string; type: 'income' | 'expense'; color?: string; icon?: string; family_id: string }) =>
    post<Category>('/v1/categories', body),
  deleteCategory: (id: string) => del<{ success: boolean }>(`/v1/categories/${id}`),
  listSubcategories: (category_id?: string) =>
    get<Subcategory[]>('/v1/subcategories', { category_id }),
  createSubcategory: (body: { category_id: string; name: string }) =>
    post<Subcategory>('/v1/subcategories', body),
  deleteSubcategory: (id: string) => del<{ success: boolean }>(`/v1/subcategories/${id}`),

  // ---------------------------------------------------------------
  // Transações e Itens de Recibo
  // ---------------------------------------------------------------
  listTransactions: (params: { family_id?: string; from?: number; limit?: number } = {}) =>
    get<Transaction[]>('/v1/transactions', params),
  createTransaction: (body: Partial<Transaction> & {
    family_id: string; description: string; amount: number; type: 'income' | 'expense'; created_by: string;
  }) => post<Transaction>('/v1/transactions', body),
  updateTransaction: (id: string, body: Partial<Transaction>) => patch<Transaction>(`/v1/transactions/${id}`, body),
  deleteTransaction: (id: string) => del<{ success: boolean }>(`/v1/transactions/${id}`),
  createReceiptItems: (items: Array<Omit<ReceiptItem, 'id' | 'created_at'>>) =>
    post<ReceiptItem[]>('/v1/receipt-items', items),

  // ---------------------------------------------------------------
  // Orçamentos, Metas e Planejamento
  // ---------------------------------------------------------------
  listBudgets: (family_id?: string) => get<Budget[]>('/v1/budgets', { family_id }),
  createBudget: (body: { family_id: string; category_id: string; limit_amount: number; period?: string }) =>
    post<Budget>('/v1/budgets', body),
  deleteBudget: (id: string) => del<{ success: boolean }>(`/v1/budgets/${id}`),
  listGoals: (family_id?: string) => get<Goal[]>('/v1/goals', { family_id }),
  createGoal: (body: { family_id: string; name: string; target_amount: number; deadline?: string | null; icon?: string; color?: string }) =>
    post<Goal>('/v1/goals', body),
  updateGoal: (id: string, body: Partial<Goal>) => patch<Goal>(`/v1/goals/${id}`, body),
  deleteGoal: (id: string) => del<{ success: boolean }>(`/v1/goals/${id}`),
  listPlanningItems: (family_id?: string) => get<PlanningItem[]>('/v1/planning-items', { family_id }),
  createPlanningItem: (body: Partial<PlanningItem> & {
    family_id: string; description: string; type: 'income' | 'expense'; amount: number; expected_date: string; created_by: string;
  }) => post<PlanningItem>('/v1/planning-items', body),
  updatePlanningItem: (id: string, body: Partial<PlanningItem>) =>
    patch<PlanningItem>(`/v1/planning-items/${id}`, body),
  deletePlanningItem: (id: string) => del<{ success: boolean }>(`/v1/planning-items/${id}`),

  // ---------------------------------------------------------------
  // Tabela Base de Ingredientes
  // ---------------------------------------------------------------
  listIngredients: (family_id?: string) => get<Ingredient[]>('/v1/ingredients', { family_id }),
  createIngredient: (body: { family_id: string; name: string; package_grams?: number; package_cost?: number }) =>
    post<Ingredient>('/v1/ingredients', body),
  updateIngredient: (id: string, body: Partial<Omit<Ingredient, 'id' | 'family_id'>>) =>
    patch<Ingredient>(`/v1/ingredients/${id}`, body),
  deleteIngredient: (id: string) => del<{ success: boolean }>(`/v1/ingredients/${id}`),

  // ---------------------------------------------------------------
  // Receitas de Precificação
  // ---------------------------------------------------------------
  listRecipes: (family_id?: string) => get<PricingRecipe[]>('/v1/pricing-recipes', { family_id }),
  getRecipe: (id: string) => get<PricingRecipe>(`/v1/pricing-recipes/${id}`),
  getRecipeItems: (id: string) => get<RecipeItem[]>(`/v1/pricing-recipes/${id}/items`),
  createRecipe: (body: { family_id: string; name: string; created_by: string; yield_quantity?: number; packaging_cost?: number }) =>
    post<PricingRecipe>('/v1/pricing-recipes', body),
  updateRecipe: (id: string, body: Partial<PricingRecipe>) => patch<PricingRecipe>(`/v1/pricing-recipes/${id}`, body),
  replaceRecipeItems: (id: string, items: Array<Omit<RecipeItem, 'id' | 'recipe_id'>>) =>
    put<{ success: boolean; count: number }>(`/v1/pricing-recipes/${id}/items`, { items }),
  updateProductCostsByRecipe: (id: string, cost_price: number) =>
    patch<{ success: boolean; count: number }>(`/v1/pricing-recipes/${id}/products-cost`, { cost_price }),
  deleteRecipe: (id: string) => del<{ success: boolean }>(`/v1/pricing-recipes/${id}`),

  // ---------------------------------------------------------------
  // Produtos e Vendas
  // ---------------------------------------------------------------
  listProducts: (family_id?: string) => get<Product[]>('/v1/products', { family_id }),
  createProduct: (body: { family_id: string; name: string; selling_price?: number | null; unit?: string }) =>
    post<Product>('/v1/products', body),
  updateProduct: (id: string, body: Partial<Omit<Product, 'id' | 'family_id'>>) =>
    patch<Product>(`/v1/products/${id}`, body),
  deleteProduct: (id: string) => del<{ success: boolean }>(`/v1/products/${id}`),
  listSales: (params: { family_id?: string; from?: number; limit?: number } = {}) =>
    get<Sale[]>('/v1/sales', params),
  createSale: (body: Partial<Sale> & { family_id: string; product_id: string; quantity: number; created_by: string }) =>
    post<Sale>('/v1/sales', body),
};

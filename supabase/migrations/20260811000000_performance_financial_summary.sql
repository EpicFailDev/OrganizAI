-- ============================================================
-- Migration: Otimizações de Desempenho (Foco em Consultas)
-- Data: 2026-08-11
--
-- 1. get_financial_summary passa a retornar top_category, permitindo que a
--    API agregue tudo no banco (uma única query) em vez de trazer todas as
--    transações para a memória do servidor e agregar em JavaScript.
-- 2. Índices adicionais para consultas de listagem por família/ordenação:
--    - family_members(profile_id): resumo de analytics e GET /me/family
--    - sales(family_id, sale_date DESC): listagem de vendas ordenada
--    - recipe_items(recipe_id, sort_order): itens de receita ordenados
-- ============================================================

-- ------------------------------------------------------------
-- 1. RPC get_financial_summary com top_category (agregação no banco)
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_financial_summary(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_family_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_income numeric,
  total_expense numeric,
  balance numeric,
  transaction_count bigint,
  top_category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_member_of_family(p_family_id) THEN
    RAISE EXCEPTION 'Acesso negado para esta família';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)::numeric AS total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0)::numeric AS total_expense,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)::numeric AS balance,
    COUNT(*)::bigint AS transaction_count,
    (
      SELECT COALESCE(c.name, 'Sem categoria')
      FROM public.transactions t2
      LEFT JOIN public.categories c ON c.id = t2.category_id
      WHERE t2.family_id = p_family_id
        AND t2.type = 'expense'
        AND (p_start_date IS NULL OR t2.date >= p_start_date)
        AND (p_end_date IS NULL OR t2.date <= p_end_date)
      GROUP BY c.name
      ORDER BY SUM(t2.amount) DESC
      LIMIT 1
    ) AS top_category
  FROM public.transactions t
  WHERE t.family_id = p_family_id
    AND (p_start_date IS NULL OR t.date >= p_start_date)
    AND (p_end_date IS NULL OR t.date <= p_end_date);
END;
$$;

-- ------------------------------------------------------------
-- 2. Índices adicionais para consultas recorrentes
-- ------------------------------------------------------------

-- Busca a família de um usuário pelo profile_id (GET /me/family e analytics).
CREATE INDEX IF NOT EXISTS idx_family_members_profile_id ON public.family_members(profile_id);

-- Listagem de vendas: WHERE family_id = ? ORDER BY sale_date DESC.
CREATE INDEX IF NOT EXISTS idx_sales_family_date ON public.sales(family_id, sale_date DESC);

-- Itens de receita ordenados (GET /pricing-recipes/:id/items).
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe_sort ON public.recipe_items(recipe_id, sort_order);

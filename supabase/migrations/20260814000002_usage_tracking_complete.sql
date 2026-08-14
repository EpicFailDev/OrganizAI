-- ============================================================
-- Migration: completa o tracking de uso de categorias
--
-- 1. Índices de uso que faltavam (parte do intelligent_categories).
-- 2. RPC increment_category_usage: substitui o uso inválido de
--    db.raw() no cliente supabase-js por uma função SQL atômica,
--    com verificação de que o usuário é membro da família dona da
--    categoria (categorias globais com family_id NULL são públicas).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_category_rules_category_id ON public.category_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_usage ON public.subcategories(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_categories_usage ON public.categories(usage_count DESC);

CREATE OR REPLACE FUNCTION public.increment_category_usage(
  p_category_id uuid,
  p_subcategory_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_sub_family_id uuid;
BEGIN
  SELECT family_id INTO v_family_id
  FROM public.categories
  WHERE id = p_category_id;

  IF v_family_id IS NOT NULL AND NOT public.is_member_of_family(v_family_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.categories
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used = now()
  WHERE id = p_category_id;

  IF p_subcategory_id IS NOT NULL THEN
    SELECT c.family_id INTO v_sub_family_id
    FROM public.subcategories s
    JOIN public.categories c ON c.id = s.category_id
    WHERE s.id = p_subcategory_id;

    IF v_sub_family_id IS NOT NULL AND NOT public.is_member_of_family(v_sub_family_id) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;

    UPDATE public.subcategories
    SET usage_count = COALESCE(usage_count, 0) + 1,
        last_used = now()
    WHERE id = p_subcategory_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_category_usage(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_category_usage(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_category_usage(uuid, uuid) TO authenticated;
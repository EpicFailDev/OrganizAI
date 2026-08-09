-- ============================================================
-- Migration: Correções de segurança e consistência (auditoria)
-- Data: 2026-08-12
--
-- 1. Membros podem sair do grupo (DELETE) — antes só admin removia.
-- 2. Protege o último admin: impede remoção que deixaria a família sem admin.
-- 3. RPC replace_recipe_items: substituição transacional de itens de receita
--    (antes era DELETE + INSERT em duas chamadas, com risco de perda de dados).
-- 4. Trigger de integridade em sales: recalcula total_price e profit.
-- 5. Revoga EXECUTE anônimo das funções SECURITY DEFINER sensíveis.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Políticas de family_members: saída voluntária + admin
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Apenas admins da família podem atualizar/remover membros" ON public.family_members;

-- Update continua restrito a admins (mudar role de membros).
CREATE POLICY "Apenas admins podem atualizar membros"
  ON public.family_members FOR UPDATE TO authenticated
  USING (public.is_family_admin(family_id))
  WITH CHECK (public.is_family_admin(family_id));

-- Delete: o próprio membro pode sair, ou um admin pode remover.
CREATE POLICY "Membro pode sair do próprio grupo ou admin pode remover"
  ON public.family_members FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR public.is_family_admin(family_id));

-- ------------------------------------------------------------
-- 2. Proteção do último administrador
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = OLD.family_id
        AND profile_id <> OLD.profile_id
        AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador da família';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_admin ON public.family_members;
CREATE TRIGGER trg_protect_last_admin
  BEFORE DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin();

-- ------------------------------------------------------------
-- 3. RPC transacional: substituir itens de receita
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.replace_recipe_items(p_recipe_id uuid, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT family_id INTO v_family_id
  FROM public.pricing_recipes
  WHERE id = p_recipe_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Receita não encontrada';
  END IF;

  IF NOT public.is_member_of_family(v_family_id) THEN
    RAISE EXCEPTION 'Acesso negado para esta família';
  END IF;

  DELETE FROM public.recipe_items WHERE recipe_id = p_recipe_id;

  IF jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.recipe_items
      (recipe_id, ingredient_name, package_grams, package_cost, used_grams, sort_order)
    SELECT
      p_recipe_id,
      item->>'ingredient_name',
      COALESCE((item->>'package_grams')::numeric, 0),
      COALESCE((item->>'package_cost')::numeric, 0),
      COALESCE((item->>'used_grams')::numeric, 0),
      COALESCE((item->>'sort_order')::integer, 0)
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 4. Integridade de vendas: total e lucro calculados no banco
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sales_set_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.total_price := ROUND((NEW.quantity * NEW.unit_price)::numeric, 2);
  NEW.profit := ROUND((NEW.total_price - COALESCE(NEW.cost_price, 0) * NEW.quantity)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_set_defaults ON public.sales;
CREATE TRIGGER trg_sales_set_defaults
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sales_set_defaults();

-- ------------------------------------------------------------
-- 5. Privilégios: anon não executa funções SECURITY DEFINER
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.create_family(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_family(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_summary(uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_recipe_items(uuid, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION public.replace_recipe_items(uuid, jsonb) TO authenticated;

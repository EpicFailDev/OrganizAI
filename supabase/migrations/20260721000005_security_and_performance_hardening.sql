-- ============================================================
-- Migration: Hardening de Segurança RLS, Índices e RPCs (Curto Prazo)
-- Data: 2026-07-21 / 2026-08-03
-- Corrigi: S2, S4, S5, S6, S7, S8, D1, D3, W2
-- ============================================================

-- ------------------------------------------------------------
-- 1. Hardening de Funções SECURITY DEFINER (SET search_path = '') [S4]
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_family(family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = $1
      AND family_members.profile_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_family_admin(family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = $1
      AND family_members.profile_id = auth.uid()
      AND family_members.role = 'admin'
  );
END;
$$;

-- Fortalecer invite_code para 12 caracteres (S8) e search_path = '' (S4)
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
  END IF;
  RETURN NEW;
END;
$$;

-- RPC join_family com search_path seguro (S4, S8)
CREATE OR REPLACE FUNCTION public.join_family(p_invite_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_family_id
  FROM public.family_groups
  WHERE invite_code = upper(trim(p_invite_code));

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.family_members
    WHERE profile_id = v_user_id AND family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Você já é membro desta família';
  END IF;

  INSERT INTO public.family_members (family_id, profile_id, role)
  VALUES (v_family_id, v_user_id, 'member');
END;
$$;

-- RPC create_family: cria família e insere fundador como admin atomicamente (S2 Fix)
CREATE OR REPLACE FUNCTION public.create_family(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_family_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nome da família é obrigatório';
  END IF;

  INSERT INTO public.family_groups (name)
  VALUES (trim(p_name))
  RETURNING id INTO v_family_id;

  INSERT INTO public.family_members (family_id, profile_id, role)
  VALUES (v_family_id, v_user_id, 'admin');

  RETURN v_family_id;
END;
$$;

-- ------------------------------------------------------------
-- 2. Correções de Políticas RLS [S2, S5, S6, D3]
-- ------------------------------------------------------------

-- S2 Fix: Bloquear autojunção direta em family_members. Apensa admins ou RPCs podem adicionar membros
DROP POLICY IF EXISTS "Usuários podem se adicionar a um grupo familiar ou admins podem adicionar" ON public.family_members;
DROP POLICY IF EXISTS "Apenas admins da família podem adicionar membros diretamente" ON public.family_members;

CREATE POLICY "Apenas admins da família podem adicionar membros diretamente"
  ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (public.is_family_admin(family_id));

-- S5 Fix: Restringir visualização de perfis aos membros da mesma família ou ao próprio usuário
DROP POLICY IF EXISTS "Qualquer usuário logado pode visualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Membros da mesma família ou o próprio usuário podem ver perfis" ON public.profiles;

CREATE POLICY "Membros da mesma família ou o próprio usuário podem ver perfis"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.family_members m1
      JOIN public.family_members m2 ON m1.family_id = m2.family_id
      WHERE m1.profile_id = public.profiles.id
        AND m2.profile_id = auth.uid()
    )
  );

-- S6 Fix: Restringir subcategorias a categorias pertencentes à família do usuário ou globais
DROP POLICY IF EXISTS "Qualquer usuário logado pode ver subcategorias" ON public.subcategories;
DROP POLICY IF EXISTS "Membros podem ver subcategorias de categorias acessíveis" ON public.subcategories;

CREATE POLICY "Membros podem ver subcategorias de categorias acessíveis"
  ON public.subcategories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = subcategories.category_id
        AND (c.family_id IS NULL OR public.is_member_of_family(c.family_id))
    )
  );

-- D3 Fix: Validar se receipt_items pertence à transação da mesma família
DROP POLICY IF EXISTS "Membros da família podem criar itens de recibo" ON public.receipt_items;
DROP POLICY IF EXISTS "Membros da família podem criar itens de recibo validados" ON public.receipt_items;

CREATE POLICY "Membros da família podem criar itens de recibo validados"
  ON public.receipt_items FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member_of_family(family_id) AND
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND t.family_id = receipt_items.family_id
    )
  );

-- D3 Fix: Validar se budgets pertence a uma categoria acessível
DROP POLICY IF EXISTS "Membros da família podem criar orçamentos" ON public.budgets;
DROP POLICY IF EXISTS "Membros da família podem criar orçamentos validados" ON public.budgets;

CREATE POLICY "Membros da família podem criar orçamentos validados"
  ON public.budgets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member_of_family(family_id) AND
    EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = category_id AND (c.family_id IS NULL OR c.family_id = budgets.family_id)
    )
  );

-- ------------------------------------------------------------
-- 3. Políticas de Storage Privado Seguras [S3, S7]
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Family members can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Family members can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Family members can delete attachments" ON storage.objects;

CREATE POLICY "Family members can view attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[2] IS NOT NULL AND
    public.is_member_of_family(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Family members can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[2] IS NOT NULL AND
    public.is_member_of_family(((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "Family members can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments' AND
    (storage.foldername(name))[2] IS NOT NULL AND
    public.is_member_of_family(((storage.foldername(name))[2])::uuid)
  );

-- ------------------------------------------------------------
-- 4. Índices de Desempenho no Banco de Dados [D1]
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions(family_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_family_id ON public.categories(family_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_family_id ON public.budgets(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_family_id ON public.goals(family_id);
CREATE INDEX IF NOT EXISTS idx_planning_items_family_date ON public.planning_items(family_id, expected_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_family_id ON public.recurring_bills(family_id);

-- ------------------------------------------------------------
-- 5. RPC Agregador Financeiro (Correção W2)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_family_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_income numeric,
  total_expense numeric,
  balance numeric,
  transaction_count bigint
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
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
    COUNT(*) AS transaction_count
  FROM public.transactions
  WHERE family_id = p_family_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
END;
$$;

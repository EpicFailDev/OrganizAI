-- ============================================================
-- MIGRAÇÕES COMBINADAS — OrganizAI
-- Execute este arquivo no SQL Editor do Supabase Dashboard:
-- https://supabase.com/dashboard/project/cwpbidoxhnocyotqzhaz/sql/new
-- ============================================================

-- ============================================================
-- MIGRATION 1: invite_code, RPC join_family, Storage policies
-- ============================================================

-- 1. Adicionar coluna invite_code na family_groups
ALTER TABLE family_groups
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Trigger: gerar invite_code automaticamente ao criar família
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_invite_code ON family_groups;

CREATE TRIGGER trg_generate_invite_code
  BEFORE INSERT ON family_groups
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code();

-- 3. Atualizar famílias existentes com invite_code
UPDATE family_groups
SET invite_code = upper(substr(md5(random()::text), 1, 8))
WHERE invite_code IS NULL;

-- 4. Função RPC: entrar na família via código de convite
CREATE OR REPLACE FUNCTION join_family(p_invite_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_family_id
  FROM family_groups
  WHERE invite_code = p_invite_code;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE profile_id = v_user_id AND family_id = v_family_id
  ) THEN
    RAISE EXCEPTION 'Você já é membro desta família';
  END IF;

  INSERT INTO family_members (family_id, profile_id, role)
  VALUES (v_family_id, v_user_id, 'member');
END;
$$;

-- 5. Políticas de Storage para bucket 'attachments'
DROP POLICY IF EXISTS "Family members can view attachments" ON storage.objects;

CREATE POLICY "Family members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM family_members
    WHERE profile_id = auth.uid()
      AND family_id = (string_to_array(name, '/'))[2]::uuid
  )
);

DROP POLICY IF EXISTS "Family members can upload attachments" ON storage.objects;

CREATE POLICY "Family members can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM family_members
    WHERE profile_id = auth.uid()
      AND family_id = (string_to_array(name, '/'))[2]::uuid
  )
);


-- ============================================================
-- MIGRATION 2: Receipt Items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.receipt_items (
    id uuid default gen_random_uuid() primary key,
    transaction_id uuid references public.transactions on delete cascade not null,
    family_id uuid references public.family_groups on delete cascade not null,
    item_name text not null,
    quantity numeric(8, 2) default 1 not null,
    unit_price numeric(12, 2) not null,
    total_price numeric(12, 2) not null,
    line_number integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_transaction_id on public.receipt_items(transaction_id);

ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Drop旧 policies if exist
DROP POLICY IF EXISTS "Membros da família podem ver itens de recibo" ON public.receipt_items;
DROP POLICY IF EXISTS "Membros da família podem criar itens de recibo" ON public.receipt_items;
DROP POLICY IF EXISTS "Membros da família podem atualizar itens de recibo" ON public.receipt_items;
DROP POLICY IF EXISTS "Membros da família podem deletar itens de recibo" ON public.receipt_items;

CREATE POLICY "Membros da família podem ver itens de recibo"
  on public.receipt_items for select to authenticated
  using (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem criar itens de recibo"
  on public.receipt_items for insert to authenticated
  with check (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem atualizar itens de recibo"
  on public.receipt_items for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem deletar itens de recibo"
  on public.receipt_items for delete to authenticated
  using (public.is_member_of_family(family_id));


-- ============================================================
-- MIGRATION 3: Budgets, Goals, Planning
-- ============================================================

-- 1. Budgets (Orçamentos)
CREATE TABLE IF NOT EXISTS public.budgets (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    category_id uuid references public.categories on delete cascade not null,
    limit_amount numeric(12, 2) not null,
    period text default 'monthly' check (period in ('weekly', 'monthly', 'yearly')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(family_id, category_id, period)
);

-- 2. Goals (Metas)
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    name text not null,
    target_amount numeric(12, 2) not null,
    current_amount numeric(12, 2) default 0 not null,
    deadline date,
    icon text default 'target',
    color text default '#10b981',
    status text default 'active' check (status in ('active', 'completed', 'cancelled')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Planning Items (Planejamento)
CREATE TABLE IF NOT EXISTS public.planning_items (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    description text not null,
    type text check (type in ('income', 'expense')) not null,
    amount numeric(12, 2) not null,
    category_id uuid references public.categories on delete set null,
    expected_date date not null,
    recurring boolean default false not null,
    recurring_pattern text check (recurring_pattern in ('weekly', 'biweekly', 'monthly', 'yearly')),
    status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')) not null,
    created_by uuid references public.profiles on delete restrict not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_items ENABLE ROW LEVEL SECURITY;

-- Budgets policies
DROP POLICY IF EXISTS "Membros podem ver orçamentos da família" ON public.budgets;
DROP POLICY IF EXISTS "Membros da família podem criar orçamentos" ON public.budgets;
DROP POLICY IF EXISTS "Membros da família podem atualizar orçamentos" ON public.budgets;
DROP POLICY IF EXISTS "Membros da família podem deletar orçamentos" ON public.budgets;

CREATE POLICY "Membros podem ver orçamentos da família"
  ON public.budgets FOR select TO authenticated
  USING (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem criar orçamentos"
  ON public.budgets FOR insert TO authenticated
  WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem atualizar orçamentos"
  ON public.budgets FOR update TO authenticated
  USING (public.is_member_of_family(family_id))
  WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem deletar orçamentos"
  ON public.budgets FOR delete TO authenticated
  USING (public.is_member_of_family(family_id));

-- Goals policies
DROP POLICY IF EXISTS "Membros podem ver metas da família" ON public.goals;
DROP POLICY IF EXISTS "Membros da família podem criar metas" ON public.goals;
DROP POLICY IF EXISTS "Membros da família podem atualizar metas" ON public.goals;
DROP POLICY IF EXISTS "Membros da família podem deletar metas" ON public.goals;

CREATE POLICY "Membros podem ver metas da família"
  ON public.goals FOR select TO authenticated
  USING (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem criar metas"
  ON public.goals FOR insert TO authenticated
  WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem atualizar metas"
  ON public.goals FOR update TO authenticated
  USING (public.is_member_of_family(family_id))
  WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem deletar metas"
  ON public.goals FOR delete TO authenticated
  USING (public.is_member_of_family(family_id));

-- Planning policies
DROP POLICY IF EXISTS "Membros podem ver planejamentos da família" ON public.planning_items;
DROP POLICY IF EXISTS "Membros da família podem criar planejamentos" ON public.planning_items;
DROP POLICY IF EXISTS "Membros da família podem atualizar planejamentos" ON public.planning_items;
DROP POLICY IF EXISTS "Membros da família podem deletar planejamentos" ON public.planning_items;

CREATE POLICY "Membros podem ver planejamentos da família"
  ON public.planning_items FOR select TO authenticated
  USING (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem criar planejamentos"
  ON public.planning_items FOR insert TO authenticated
  WITH CHECK (
    public.is_member_of_family(family_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Membros da família podem atualizar planejamentos"
  ON public.planning_items FOR update TO authenticated
  USING (public.is_member_of_family(family_id))
  WITH CHECK (public.is_member_of_family(family_id));

CREATE POLICY "Membros da família podem deletar planejamentos"
  ON public.planning_items FOR delete TO authenticated
  USING (public.is_member_of_family(family_id));


-- ============================================================
-- MIGRATION 4: Usuários padrão e família (execute SOMENTE se
-- estiver fazendo setup inicial — pule se já tem dados)
-- ============================================================

-- Se já tem family_groups com dados, comente todo este bloco:
/*
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION create_user_if_not_exists(
  p_email TEXT, p_password TEXT, p_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NOT NULL THEN RETURN v_user_id; END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, phone, phone_confirmed_at,
    phone_change, phone_change_token, phone_change_sent_at,
    confirmed_at, email_change_token_current, email_change_confirm_status,
    banned_until, reauthentication_token, reauthentication_sent_at,
    is_sso_user, deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id,
    'authenticated', 'authenticated', p_email, v_encrypted_password,
    NOW(), NOW(), NOW(), '', NOW(), '', NOW(), '', '', NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('display_name', p_display_name),
    FALSE, NULL, NULL, '', '', NOW(), NOW(), '', 0, NULL, '', FALSE, NULL
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id, 'email', p_email), 'email', NOW(), NOW(), NOW());

  INSERT INTO auth.sessions (id, user_id, created_at, updated_at, factor_id, refresh_token, aal, not_after)
  VALUES (gen_random_uuid(), v_user_id, NOW(), NOW(), NULL, '', 'aal1', NULL);

  RETURN v_user_id;
END;
$$;

SELECT create_user_if_not_exists('gui@organizai.local', 'OrganizAI2026!', 'Guilherme');
SELECT create_user_if_not_exists('jen@organizai.local', 'OrganizAI2026!', 'Jenifer');

INSERT INTO family_groups (name)
SELECT 'Família' WHERE NOT EXISTS (SELECT 1 FROM family_groups LIMIT 1);

DO $$
DECLARE
  v_family_id UUID; v_gui_id UUID; v_jen_id UUID;
BEGIN
  SELECT id INTO v_family_id FROM family_groups LIMIT 1;
  SELECT id INTO v_gui_id FROM auth.users WHERE email = 'gui@organizai.local';
  SELECT id INTO v_jen_id FROM auth.users WHERE email = 'jen@organizai.local';
  IF v_gui_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO family_members (family_id, profile_id, role) VALUES (v_family_id, v_gui_id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  IF v_jen_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO family_members (family_id, profile_id, role) VALUES (v_family_id, v_jen_id, 'member') ON CONFLICT DO NOTHING;
  END IF;
END $$;
*/


-- ============================================================
-- FIM! Verifique as tabelas criadas em:
-- https://supabase.com/dashboard/project/cwpbidoxhnocyotqzhaz/database/tables
-- ============================================================

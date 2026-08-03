-- ============================================
-- SCRIPT DE RECUPERAÇÃO - Execute no SQL Editor do Supabase
-- ============================================

-- 1. Verificar family_id correto das transações
SELECT DISTINCT family_id FROM public.transactions LIMIT 5;

-- 2. Verificar family_groups existente
SELECT * FROM public.family_groups;

-- 3. Verificar profiles existentes
SELECT * FROM public.profiles;

-- 4. Verificar family_members existentes
SELECT * FROM public.family_members;

-- ============================================
-- PASSO 1: Criar profiles para os usuários (se não existirem)
-- ============================================

-- Criar profile para Guilherme
INSERT INTO public.profiles (id, display_name, profession)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'motorista'
FROM auth.users au
WHERE au.email = 'gui@organizai.local'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id);

-- Criar profile para Jenifer
INSERT INTO public.profiles (id, display_name, profession)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'vendedor'
FROM auth.users au
WHERE au.email = 'jen@organizai.local'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id);

-- ============================================
-- PASSO 2: Adicionar membros à família (se não existirem)
-- ============================================

-- Pegar o family_id correto das transações
DO $$
DECLARE
  v_family_id uuid;
  v_gui_id uuid;
  v_jen_id uuid;
BEGIN
  -- Pegar family_id das transações
  SELECT DISTINCT family_id INTO v_family_id 
  FROM public.transactions 
  LIMIT 1;
  
  -- Pegar IDs dos usuários
  SELECT id INTO v_gui_id FROM auth.users WHERE email = 'gui@organizai.local';
  SELECT id INTO v_jen_id FROM auth.users WHERE email = 'jen@organizai.local';
  
  -- Adicionar Guilherme como admin (se não existir)
  IF v_gui_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO public.family_members (family_id, profile_id, role)
    VALUES (v_family_id, v_gui_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Adicionar Jenifer como membro (se não existir)
  IF v_jen_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO public.family_members (family_id, profile_id, role)
    VALUES (v_family_id, v_jen_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RAISE NOTICE 'Família: %, Guilherme: %, Jenifer: %', v_family_id, v_gui_id, v_jen_id;
END $$;

-- ============================================
-- PASSO 3: Verificar se tudo foi criado
-- ============================================
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as profiles_count,
  (SELECT COUNT(*) FROM public.family_members) as members_count,
  (SELECT COUNT(*) FROM public.transactions) as transactions_count;

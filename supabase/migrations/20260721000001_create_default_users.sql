-- ============================================================
-- Migration: Criar usuários padrão (Guilherme e Jenifer)
-- Data: 2026-07-21
-- ============================================================

-- Habilitar extensão necessária para hash de senhas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função para criar usuário no auth.users
CREATE OR REPLACE FUNCTION create_user_if_not_exists(
  p_email TEXT,
  p_password TEXT,
  p_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Verificar se usuário já existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Gerar UUID para o usuário
  v_user_id := gen_random_uuid();

  -- Criptografar senha usando crypt do pgcrypto
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Inserir usuário na tabela auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    confirmed_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    '',
    NOW(),
    '',
    NOW(),
    '',
    '',
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('display_name', p_display_name),
    FALSE,
    NULL,
    NULL,
    '',
    '',
    NOW(),
    NOW(),
    '',
    0,
    NULL,
    '',
    FALSE,
    NULL
  );

  -- Inserir identidade do usuário
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Inserir sessão do usuário
  INSERT INTO auth.sessions (
    id,
    user_id,
    created_at,
    updated_at,
    factor_id,
    refresh_token,
    aal,
    not_after
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    NOW(),
    NOW(),
    NULL,
    '',
    'aal1',
    NULL
  );

  RETURN v_user_id;
END;
$$;

-- Criar os dois usuários padrão
SELECT create_user_if_not_exists(
  'gui@organizai.local',
  'OrganizAI2026!',
  'Guilherme'
);

SELECT create_user_if_not_exists(
  'jen@organizai.local',
  'OrganizAI2026!',
  'Jenifer'
);

-- Criar family group padrão se não existir
INSERT INTO family_groups (name)
SELECT 'Família'
WHERE NOT EXISTS (SELECT 1 FROM family_groups LIMIT 1);

-- Adicionar ambos como membros da família
DO $$
DECLARE
  v_family_id UUID;
  v_gui_id UUID;
  v_jen_id UUID;
BEGIN
  -- Obter IDs
  SELECT id INTO v_family_id FROM family_groups LIMIT 1;
  SELECT id INTO v_gui_id FROM auth.users WHERE email = 'gui@organizai.local';
  SELECT id INTO v_jen_id FROM auth.users WHERE email = 'jen@organizai.local';

  -- Adicionar Guilherme como admin
  IF v_gui_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO family_members (family_id, profile_id, role)
    VALUES (v_family_id, v_gui_id, 'admin')
    ON CONFLICT (family_id, profile_id) DO NOTHING;
  END IF;

  -- Adicionar Jenifer como membro
  IF v_jen_id IS NOT NULL AND v_family_id IS NOT NULL THEN
    INSERT INTO family_members (family_id, profile_id, role)
    VALUES (v_family_id, v_jen_id, 'member')
    ON CONFLICT (family_id, profile_id) DO NOTHING;
  END IF;
END $$;

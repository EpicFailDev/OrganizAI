-- ============================================================
-- Migration: Adicionar invite_code, RPC join_family e políticas de Storage
-- Data: 2026-07-21
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

-- 5. Políticas de Storage para bucket 'attachments' (privado)
-- NOTA: Estas políticas só funcionam se o bucket estiver configurado como privado
-- no Dashboard do Supabase (desmarcar "Public" em Storage > Buckets > attachments)

-- Permitir leitura apenas para membros da família
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

-- Permitir upload apenas para membros da família
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

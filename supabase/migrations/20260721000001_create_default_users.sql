-- ============================================================
-- Migration: Deprecar Função e Remover Senhas Hardcoded (Fix S1, S10)
-- Data: 2026-07-21
-- ============================================================
-- IMPORTANTE DE SEGURANÇA:
-- Nunca crie usuários diretamente via INSERT em auth.users com senhas em texto claro no código SQL versionado.
-- Usuários de produção e desenvolvimento devem ser criados com senhas seguras via Supabase Dashboard,
-- Supabase CLI (supabase auth signup) ou Edge Functions utilizando variáveis de ambiente secretas.

DROP FUNCTION IF EXISTS public.create_user_if_not_exists(text, text, text);

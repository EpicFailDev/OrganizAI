-- ============================================================
-- Migration: Hardening de EXECUTE das funções SECURITY DEFINER
-- Data: 2026-08-11
--
-- Causa raiz: funções criadas via SQL Editor recebem
-- GRANT EXECUTE TO PUBLIC por padrão, e o role 'anon' herda o
-- privilégio via PUBLIC. Revogar de 'anon' isoladamente não tem
-- efeito; é necessário revogar de PUBLIC e conceder apenas a
-- 'authenticated'.
--
-- handle_new_user é invocada pelo trigger on_auth_user_created em
-- auth.users (roda como supabase_auth_admin) e rls_auto_enable é um
-- event trigger: nenhum role externo deve conseguir chamá-las.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_family(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_family(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_financial_summary(uuid, date, date) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.is_family_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member_of_family(uuid) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- Funções criadas depois (trigger/RPC de hardening) também herdam EXECUTE PUBLIC
-- e o Supabase adiciona grants explícitos a anon/authenticated/service_role.
REVOKE EXECUTE ON FUNCTION public.protect_last_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_recipe_items(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sales_set_defaults() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_family(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_family(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_recipe_items(uuid, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

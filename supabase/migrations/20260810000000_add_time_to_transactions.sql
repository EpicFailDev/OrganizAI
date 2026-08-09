-- ============================================================
-- Migration: coluna `time` em transactions
-- Data: 2026-08-10
--
-- O frontend (detalhe/edição de lançamentos) envia `time` (HH:MM:SS).
-- Esta migration alinha o contrato Zod com o schema real do banco.
-- ============================================================

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS time TIME;

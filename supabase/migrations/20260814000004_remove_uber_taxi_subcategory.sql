-- ============================================================
-- Migration: remove a subcategoria Uber/Taxi
-- Mantém apenas a subcategoria Uber/99 em Transporte.
-- Nenhuma transação estava vinculada a Uber/Taxi.
-- ============================================================
DELETE FROM public.subcategories
WHERE id = 'd8427fa8-b6fe-4d33-b143-c1ab95f91799'
  AND name = 'Uber/Taxi';
-- Reorganize categories: move Uber/99 to Transporte and add Mercado under Alimentacao
-- This migration reassigns subcategories to better reflect user intentions:
-- - Uber/99 should be under Transporte (expense) instead of Trabalho Gui (income)
-- - Mercado should be a subcategory under Alimentacao

-- Step 1: Reassign Uber/99 subcategory from Trabalho Gui to Transporte
-- The subcategory "Uber/99" currently belongs to category "Trabalho Gui" (income)
-- We move it to category "Transporte" (expense)
UPDATE public.subcategories
SET category_id = 'a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d' -- Transporte category
WHERE name = 'Uber/99';

-- Step 2: Add "Mercado" as a subcategory under "Alimentacao"
-- Alimentacao category ID: c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f
INSERT INTO public.subcategories (category_id, name)
SELECT
  'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f'::uuid, -- Alimentacao category
  'Mercado'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subcategories WHERE name = 'Mercado'
);
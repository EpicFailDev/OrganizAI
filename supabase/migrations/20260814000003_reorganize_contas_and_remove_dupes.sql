-- ============================================================
-- Migration: reorganizar Contas e remover categorias duplicadas
--
-- 1. Adiciona subcategorias Agua, Luz, Internet, Telefone, Aluguel
--    à categoria "Contas".
-- 2. Reclassifica transações das categorias removidas:
--    - Uber / 99  -> Transporte + subcat Uber/99
--    - Mercado    -> Alimentacao + subcat Mercado
--    - Moradia    -> Contas + subcat Aluguel
-- 3. Mapeia transações de Contas por descrição de concessão:
--    GUARIROBA -> Agua, ENERGISA -> Luz, TELEFONICA -> Internet,
--    "Aluguel" -> Aluguel.
-- 4. Remove as categorias duplicadas/obsoletas (Uber / 99, Mercado,
--    Moradia) agora sem referências.
-- ============================================================

INSERT INTO public.subcategories (category_id, name)
SELECT '8838b4de-dcf2-429a-bc92-9ca620036e7b', v.n
FROM (VALUES ('Agua'), ('Luz'), ('Internet'), ('Telefone'), ('Aluguel')) AS v(n)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subcategories
  WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b' AND name = v.n
);

UPDATE public.transactions t
SET category_id = 'a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
    subcategory_id = '4169b37b-5b0a-45d2-9b92-9663e8a806dc'
WHERE t.category_id = '3d4da1d9-6d03-4a07-9166-732f04da398d';

UPDATE public.transactions t
SET category_id = 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
    subcategory_id = 'aa9d7882-e4c9-42af-bf29-34ca2d65cf13'
WHERE t.category_id = '267926f2-21fa-4d59-a3be-ef098c48959f';

UPDATE public.transactions t
SET category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b',
    subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Aluguel' LIMIT 1)
WHERE t.category_id = 'f7e6d5c4-b3a2-1f0e-9d8c-7b6a5f4e3d2c';

UPDATE public.transactions t
SET subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Agua' LIMIT 1)
WHERE t.category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
  AND t.subcategory_id IS NULL
  AND t.description ILIKE '%GUARIROBA%';

UPDATE public.transactions t
SET subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Luz' LIMIT 1)
WHERE t.category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
  AND t.subcategory_id IS NULL
  AND t.description ILIKE '%ENERGISA%';

UPDATE public.transactions t
SET subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Internet' LIMIT 1)
WHERE t.category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
  AND t.subcategory_id IS NULL
  AND t.description ILIKE '%TELEFONICA%';

UPDATE public.transactions t
SET subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Aluguel' LIMIT 1)
WHERE t.category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
  AND t.subcategory_id IS NULL
  AND t.description ILIKE 'Aluguel';

DELETE FROM public.subcategories s
WHERE s.category_id = '3d4da1d9-6d03-4a07-9166-732f04da398d'
   OR s.category_id = '267926f2-21fa-4d59-a3be-ef098c48959f'
   OR s.category_id = 'f7e6d5c4-b3a2-1f0e-9d8c-7b6a5f4e3d2c';

DELETE FROM public.categories
WHERE id IN ('3d4da1d9-6d03-4a07-9166-732f04da398d',
             '267926f2-21fa-4d59-a3be-ef098c48959f',
             'f7e6d5c4-b3a2-1f0e-9d8c-7b6a5f4e3d2c');
-- ============================================================
-- Migration: adiciona a subcategoria "Aluguel Carro" em Contas
-- e vincula a transação "Aluguel Carro" (R$ 1.400,00) a ela.
-- ============================================================
INSERT INTO public.subcategories (category_id, name)
SELECT '8838b4de-dcf2-429a-bc92-9ca620036e7b', 'Aluguel Carro'
WHERE NOT EXISTS (
  SELECT 1 FROM public.subcategories
  WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b' AND name = 'Aluguel Carro'
);

UPDATE public.transactions t
SET subcategory_id = (SELECT id FROM public.subcategories
                      WHERE category_id = '8838b4de-dcf2-429a-bc92-9ca620036e7b'
                        AND name = 'Aluguel Carro' LIMIT 1)
WHERE t.id = 'c24c9911-8ac5-4016-8d4c-ff819bee3440'
  AND t.subcategory_id IS NULL;
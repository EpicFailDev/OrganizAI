-- ============================================================
-- MIGRATION: Seed dados de precificação da Jenifer (Vendedora)
-- Fonte: planilha "DOCE DE RUA.xlsx" (por Tábata Romero)
-- Popula: ingredients_base (TABELA 1), pricing_recipes + recipe_items
--         (Calculadora de Precificação) e products (preço de venda).
-- Idempotente: pode rodar mais de uma vez sem duplicar dados.
-- ============================================================

DO $$
DECLARE
  v_family_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- Família Muller
  v_jenifer_id uuid;
  v_recipe_doguinho uuid;
  v_recipe_bauru uuid;
  v_recipe_esfiha uuid;
BEGIN
  -- ── 0. Localizar a Jenifer ──────────────────────────────
  SELECT id INTO v_jenifer_id FROM auth.users WHERE email = 'jen@organizai.local';

  IF v_jenifer_id IS NULL THEN
    RAISE NOTICE 'Usuário jen@organizai.local não encontrado — nada foi inserido.';
    RETURN;
  END IF;

  -- ── 1. TABELA 1 - BASE (ingredients_base) ───────────────
  -- Insere cada ingrediente individualmente (idempotente por nome):
  -- se a família já tiver aquele ingrediente, ele é ignorado.
  INSERT INTO public.ingredients_base (family_id, name, package_grams, package_cost)
  SELECT v_family_id, seed.name, seed.package_grams, seed.package_cost
  FROM (VALUES
    ('Alho',                    1000, 16.90),
    ('Achocolatado',             370,  7.80),
    ('Açúcar cristal',          1000,  2.50),
    ('Açúcar de confeiteiro',    500,  5.00),
    ('Açúcar demerara',         1000,  5.00),
    ('Açúcar refinado',         1000,  3.75),
    ('Amido de milho',           200,  7.00),
    ('Bicarbonato de sódio',     500, 10.55),
    ('Biscoito maisena',         400,  9.00),
    ('Cacau em pó',              250, 10.00),
    ('Canela em pó',              50,  5.00),
    ('Cenoura',                 1000, 11.00),
    ('Chantilly',               1000, 12.00),
    ('Chocolate ao leite',       380, 13.00),
    ('Chocolate branco',        1000, 14.00),
    ('Chocolate em pó',         1000, 26.00),
    ('Chocolate meio amargo',   1000, 16.00),
    ('Coco ralado',              100, 17.00),
    ('Confeitos',                100, 18.00),
    ('Cebola',                  1000,  4.00),
    ('Creme de leite',           200, 19.00),
    ('Doce de leite',            395, 20.00),
    ('Doce de leite Itambé',     395,  9.85),
    ('Essência de baunilha',      30, 21.00),
    ('Farinha de trigo',        1000,  4.20),
    ('Fermento em pó',           100,  2.50),
    ('Granulado',                 50, 24.00),
    ('Leite',                   1000,  5.25),
    ('Leite Condensado',         395,  4.50),
    ('Leite de coco',            400, 27.00),
    ('Leite em pó',              400, 28.00),
    ('Limão',                   1000,  4.50),
    ('Mel',                     1000, 38.00),
    ('Manteiga',                 500,  8.90),
    ('Morango',                 1000, 32.00),
    ('Nutella',                  400, 33.00),
    ('Óleo',                     900,  7.50),
    ('Ovos (em unidades)',        20,  9.00),
    ('Laranja',                 1000,  2.00),
    ('Fermento Biológico',       500, 24.50),
    ('Orégano',                  250,  8.00),
    ('Sal',                     1000,  2.50),
    ('Salsicha',                  18,  7.30),
    ('Requeijão',                400, 13.00),
    ('Cream Cheese',            1200, 30.00),
    ('Molho Tomate',             300,  2.60),
    ('Frango',                   700, 15.00),
    ('Queijo',                  1000, 42.90),
    ('Presunto',                1000, 16.00),
    ('Kinor',                     12,  6.00),
    ('Tomate',                  1000,  5.50),
    ('Carne Moída',             1000, 27.00),
    ('Pimenta do reino',          20,  7.00)
  ) AS seed(name, package_grams, package_cost)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ingredients_base ib
    WHERE ib.family_id = v_family_id AND ib.name = seed.name
  );

  -- ── 2. RECEITA: DOGUINHO ────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.pricing_recipes
    WHERE family_id = v_family_id AND name = 'Doguinho'
  ) THEN
    INSERT INTO public.pricing_recipes (family_id, name, created_by, yield_quantity, packaging_cost, notes)
    VALUES (v_family_id, 'Doguinho', v_jenifer_id, 10, 0.13,
            'Importada da planilha DOCE DE RUA.xlsx — precificado em 15/01/2022')
    RETURNING id INTO v_recipe_doguinho;

    INSERT INTO public.recipe_items (recipe_id, ingredient_name, package_grams, package_cost, used_grams, sort_order) VALUES
      (v_recipe_doguinho, 'Farinha de trigo',    1000,  4.20,  470.0, 0),
      (v_recipe_doguinho, 'Ovos (em unidades)',    20,  9.00,    2.0, 1),
      (v_recipe_doguinho, 'Açúcar refinado',     1000,  3.75,   30.0, 2),
      (v_recipe_doguinho, 'Fermento Biológico',   500, 24.50,   10.0, 3),
      (v_recipe_doguinho, 'Sal',                 1000,  2.50,   10.0, 4),
      (v_recipe_doguinho, 'Manteiga',             500,  8.90,   40.0, 5),
      (v_recipe_doguinho, 'Óleo',                 900,  7.50,   30.0, 6),
      (v_recipe_doguinho, 'Salsicha',              18,  7.30,   10.0, 7),
      (v_recipe_doguinho, 'Requeijão',            400, 13.00,  150.0, 8),
      (v_recipe_doguinho, 'Molho Tomate',         300,  2.60,   80.0, 9);

    INSERT INTO public.products (family_id, name, recipe_id, selling_price, cost_price, unit, active)
    VALUES (v_family_id, 'Doguinho', v_recipe_doguinho, 5.41, 1.41, 'un', TRUE);
  END IF;

  -- ── 3. RECEITA: BAURU ───────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.pricing_recipes
    WHERE family_id = v_family_id AND name = 'Bauru'
  ) THEN
    INSERT INTO public.pricing_recipes (family_id, name, created_by, yield_quantity, packaging_cost, notes)
    VALUES (v_family_id, 'Bauru', v_jenifer_id, 10, 0.13,
            'Importada da planilha DOCE DE RUA.xlsx — precificado em 15/01/2022')
    RETURNING id INTO v_recipe_bauru;

    INSERT INTO public.recipe_items (recipe_id, ingredient_name, package_grams, package_cost, used_grams, sort_order) VALUES
      (v_recipe_bauru, 'Farinha de trigo',    1000,  4.20,  470.0, 0),
      (v_recipe_bauru, 'Ovos (em unidades)',    20,  9.00,    2.0, 1),
      (v_recipe_bauru, 'Açúcar refinado',     1000,  3.75,   30.0, 2),
      (v_recipe_bauru, 'Fermento Biológico',   500, 24.50,   10.0, 3),
      (v_recipe_bauru, 'Sal',                 1000,  2.50,   10.0, 4),
      (v_recipe_bauru, 'Manteiga',             500,  8.90,   40.0, 5),
      (v_recipe_bauru, 'Óleo',                 900,  7.50,   30.0, 6),
      (v_recipe_bauru, 'Presunto',            1000, 16.00,  200.0, 7),
      (v_recipe_bauru, 'Queijo',              1000, 42.90,  130.0, 8),
      (v_recipe_bauru, 'Tomate',              1000,  5.50,   80.0, 9),
      (v_recipe_bauru, 'Orégano',              250,  8.00,    1.0, 10),
      (v_recipe_bauru, 'Requeijão',            400, 13.00,  100.0, 11);

    INSERT INTO public.products (family_id, name, recipe_id, selling_price, cost_price, unit, active)
    VALUES (v_family_id, 'Bauru', v_recipe_bauru, 6.49, 1.70, 'un', TRUE);
  END IF;

  -- ── 4. RECEITA: ESFIHA ──────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM public.pricing_recipes
    WHERE family_id = v_family_id AND name = 'Esfiha'
  ) THEN
    INSERT INTO public.pricing_recipes (family_id, name, created_by, yield_quantity, packaging_cost, notes)
    VALUES (v_family_id, 'Esfiha', v_jenifer_id, 10, 0.13,
            'Importada da planilha DOCE DE RUA.xlsx — precificado em 15/01/2022')
    RETURNING id INTO v_recipe_esfiha;

    INSERT INTO public.recipe_items (recipe_id, ingredient_name, package_grams, package_cost, used_grams, sort_order) VALUES
      (v_recipe_esfiha, 'Farinha de trigo',    1000,  4.20,  470.0, 0),
      (v_recipe_esfiha, 'Ovos (em unidades)',    20,  9.00,    2.0, 1),
      (v_recipe_esfiha, 'Açúcar refinado',     1000,  3.75,   30.0, 2),
      (v_recipe_esfiha, 'Fermento Biológico',   500, 24.50,   10.0, 3),
      (v_recipe_esfiha, 'Sal',                 1000,  2.50,   10.0, 4),
      (v_recipe_esfiha, 'Manteiga',             500,  8.90,   40.0, 5),
      (v_recipe_esfiha, 'Óleo',                 900,  7.50,   30.0, 6),
      (v_recipe_esfiha, 'Carne Moída',         1000, 27.00,  320.0, 7),
      (v_recipe_esfiha, 'Limão',               1000,  4.50,  150.0, 8),
      (v_recipe_esfiha, 'Tomate',              1000,  5.50,  250.0, 9),
      (v_recipe_esfiha, 'Cebola',              1000,  4.00,  180.0, 10);

    INSERT INTO public.products (family_id, name, recipe_id, selling_price, cost_price, unit, active)
    VALUES (v_family_id, 'Esfiha', v_recipe_esfiha, 6.08, 1.59, 'un', TRUE);
  END IF;

  RAISE NOTICE 'Seed de precificação da Jenifer concluído para a família %.', v_family_id;
END $$;

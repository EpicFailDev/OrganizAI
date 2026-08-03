-- Create pricing calculator tables for Jennifer's sales tab
-- These tables support the pricing calculator, products, and sales tracking

-- =====================================================
-- 1. INGREDIENTS BASE (Tabela Base de Ingredientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ingredients_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    package_grams DECIMAL(10,2) NOT NULL DEFAULT 0,
    package_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for ingredients_base
ALTER TABLE public.ingredients_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_can_access_ingredients" ON public.ingredients_base
    FOR ALL USING (public.is_member_of_family(family_id));

-- =====================================================
-- 2. PRICING RECIPES (Receitas de Precificação)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pricing_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    yield_quantity INTEGER DEFAULT 1,
    packaging_cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

-- RLS for pricing_recipes
ALTER TABLE public.pricing_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_can_access_recipes" ON public.pricing_recipes
    FOR ALL USING (public.is_member_of_family(family_id));

-- =====================================================
-- 3. RECIPE ITEMS (Ingredientes da Receita)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID REFERENCES public.pricing_recipes(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    package_grams DECIMAL(10,2) DEFAULT 0,
    package_cost DECIMAL(10,2) DEFAULT 0,
    used_grams DECIMAL(10,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for recipe_items
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_can_access_recipe_items" ON public.recipe_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pricing_recipes pr
            WHERE pr.id = recipe_items.recipe_id
            AND public.is_member_of_family(pr.family_id)
        )
    );

-- =====================================================
-- 4. PRODUCTS (Produtos Cadastrados)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    recipe_id UUID REFERENCES public.pricing_recipes(id),
    selling_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    unit TEXT DEFAULT 'un',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_can_access_products" ON public.products
    FOR ALL USING (public.is_member_of_family(family_id));

-- =====================================================
-- 5. SALES (Registro de Vendas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2),
    profit DECIMAL(10,2),
    sale_date DATE DEFAULT CURRENT_DATE,
    sale_time TIME,
    customer_name TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_members_can_access_sales" ON public.sales
    FOR ALL USING (public.is_member_of_family(family_id));

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ingredients_base_family ON public.ingredients_base(family_id);
CREATE INDEX IF NOT EXISTS idx_pricing_recipes_family ON public.pricing_recipes(family_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_products_family ON public.products(family_id);
CREATE INDEX IF NOT EXISTS idx_products_recipe ON public.products(recipe_id);
CREATE INDEX IF NOT EXISTS idx_sales_family ON public.sales(family_id);
CREATE INDEX IF NOT EXISTS idx_sales_product ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);

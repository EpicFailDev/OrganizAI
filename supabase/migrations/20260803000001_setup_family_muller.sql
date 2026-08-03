-- Setup family "Muller" with sample data
-- This recreates the family structure and sample transactions

-- First, we need to find the user IDs for Guilherme and Jenifer
-- These are hardcoded in the ProfileSelector

-- Create the family group
INSERT INTO public.family_groups (id, name, invite_code)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Muller',
  'MULLER2026'
)
ON CONFLICT (id) DO NOTHING;

-- Add Guilherme as admin
INSERT INTO public.family_members (family_id, profile_id, role)
SELECT 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  au.id,
  'admin'
FROM auth.users au
WHERE au.email = 'gui@organizai.local'
ON CONFLICT DO NOTHING;

-- Add Jenifer as member
INSERT INTO public.family_members (family_id, profile_id, role)
SELECT 
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  au.id,
  'member'
FROM auth.users au
WHERE au.email = 'jen@organizai.local'
ON CONFLICT DO NOTHING;

-- Update professions
UPDATE public.profiles 
SET profession = 'motorista'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'gui@organizai.local'
);

UPDATE public.profiles 
SET profession = 'vendedor'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'jen@organizai.local'
);

-- Create default categories if they don't exist
INSERT INTO public.categories (id, name, type, color, icon, family_id)
VALUES 
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Combustível', 'expense', '#ff453a', 'fuel', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567892', 'Alimentação', 'expense', '#34c759', 'shopping-cart', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567893', 'Moradia', 'expense', '#007aff', 'home', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567894', 'Transporte', 'expense', '#5856d6', 'car', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567895', 'Pessoal', 'expense', '#ff9500', 'user', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567896', 'Contas', 'expense', '#af52de', 'receipt', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567897', 'Uber/99', 'income', '#10b981', 'car', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567898', 'Salgados', 'income', '#f59e0b', 'cookie', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('c1b2c3d4-e5f6-7890-abcd-ef1234567899', 'Outros', 'income', '#8b5cf6', 'sparkles', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
ON CONFLICT (id) DO NOTHING;

-- Create sample transactions for August 2026 (current month)
DO $$
DECLARE
  v_gui_id uuid;
  v_jen_id uuid;
  v_family_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
BEGIN
  -- Get user IDs
  SELECT id INTO v_gui_id FROM auth.users WHERE email = 'gui@organizai.local';
  SELECT id INTO v_jen_id FROM auth.users WHERE email = 'jen@organizai.local';
  
  -- Only insert if users exist and no transactions exist yet
  IF v_gui_id IS NOT NULL AND v_jen_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE family_id = v_family_id) THEN
      
      -- Guilherme's Uber/99 transactions
      INSERT INTO public.transactions (family_id, date, description, type, amount, category_id, created_by)
      VALUES 
        (v_family_id, '2026-08-01', '99 Pop - Corrida', 'income', 28.40, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id),
        (v_family_id, '2026-08-01', 'Uber - Corrida', 'income', 45.20, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id),
        (v_family_id, '2026-08-02', '99 Pop - Corrida', 'income', 32.50, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id),
        (v_family_id, '2026-08-02', 'Uber - Corrida', 'income', 38.90, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id),
        (v_family_id, '2026-08-03', '99 Pop - Corrida', 'income', 25.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id),
        (v_family_id, '2026-08-03', 'Uber - Corrida', 'income', 52.30, 'c1b2c3d4-e5f6-7890-abcd-ef1234567897', v_gui_id);
      
      -- Jennifer's Salgados sales
      INSERT INTO public.transactions (family_id, date, description, type, amount, category_id, created_by)
      VALUES 
        (v_family_id, '2026-08-01', 'Venda Salgados', 'income', 150.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567898', v_jen_id),
        (v_family_id, '2026-08-02', 'Venda Salgados', 'income', 120.50, 'c1b2c3d4-e5f6-7890-abcd-ef1234567898', v_jen_id),
        (v_family_id, '2026-08-03', 'Venda Salgados', 'income', 180.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567898', v_jen_id);
      
      -- Shared expenses
      INSERT INTO public.transactions (family_id, date, description, type, amount, category_id, created_by)
      VALUES 
        (v_family_id, '2026-08-01', 'Combustível', 'expense', 120.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567891', v_gui_id),
        (v_family_id, '2026-08-02', 'Mercado', 'expense', 285.50, 'c1b2c3d4-e5f6-7890-abcd-ef1234567892', v_jen_id),
        (v_family_id, '2026-08-02', 'Conta de Luz', 'expense', 180.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567896', v_gui_id),
        (v_family_id, '2026-08-03', 'Conta de Água', 'expense', 85.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567896', v_gui_id),
        (v_family_id, '2026-08-03', 'Internet', 'expense', 99.90, 'c1b2c3d4-e5f6-7890-abcd-ef1234567896', v_jen_id),
        (v_family_id, '2026-08-03', 'Aluguel', 'expense', 1200.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567893', v_gui_id),
        (v_family_id, '2026-08-03', 'Caixa Isopor', 'expense', 8.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567895', v_jen_id),
        (v_family_id, '2026-08-03', 'Advogado', 'expense', 350.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567895', v_gui_id),
        (v_family_id, '2026-08-03', 'Motel', 'expense', 135.00, 'c1b2c3d4-e5f6-7890-abcd-ef1234567895', v_gui_id);
        
    END IF;
  END IF;
END $$;

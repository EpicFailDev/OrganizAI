-- Add profession/occupation field to profiles table
-- This allows dynamic UI customization based on user's profession

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profession text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.profession IS 'User profession/occupation for dynamic UI customization (e.g., motorista, vendedor, etc.)';

-- Update Guilherme's profile with profession
UPDATE public.profiles
SET profession = 'motorista'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'gui@organizai.local' LIMIT 1
);

-- Update Jennifer's profile with profession
UPDATE public.profiles
SET profession = 'vendedor'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'jen@organizai.local' LIMIT 1
);

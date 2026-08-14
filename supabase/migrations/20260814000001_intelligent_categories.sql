-- Intelligent & Dynamic Categories Enhancement
-- Adds auto-categorization rules, usage tracking, and hierarchical structure

-- Step 1: Create category_rules table for auto-categorization patterns
-- This allows the system to learn and automatically assign categories based on description patterns
create table if not exists public.category_rules (
    id uuid default gen_random_uuid() primary key,
    category_id uuid references public.categories on delete cascade not null,
    pattern text not null, -- regex pattern or keyword to match
    weight numeric default 1, -- priority weight (higher = more likely)
    is_regex boolean default false, -- whether pattern is a regex
    description text, -- human-readable description of the rule
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Step 2: Add usage tracking to categories
-- Track how often each category/subcategory is used for better suggestions
alter table public.categories add column if not exists usage_count integer default 0;
alter table public.categories add column if not exists last_used timestamp with time zone;

alter table public.subcategories add column if not exists usage_count integer default 0;
alter table public.subcategories add column if not exists last_used timestamp with time zone;

-- Step 3: Add hierarchy support - allow subcategories to have their own subcategories
-- This creates a deeper nesting capability for more granular organization
create table if not exists public.subcategory_groups (
    id uuid default gen_random_uuid() primary key,
    parent_subcategory_id uuid references public.subcategories on delete cascade not null,
    name text not null,
    color text,
    icon text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Step 4: Add index for performance on pattern matching
create index if not exists idx_category_rules_category_id on public.category_rules(category_id);
create index if not exists idx_category_rules_pattern on public.category_rules using gin (pattern gin_pattern_ops);
create index if not exists idx_subcategories_usage on public.subcategories(usage_count desc);
create index if not exists idx_categories_usage on public.categories(usage_count desc);

-- Step 5: Migrate existing data - apply the Uber/99 and Mercado reorganization from previous migration
-- These were already applied in 20260814000000_reorganize_categories.sql
-- Ensure Uber/99 is under Transporte and Mercado is under Alimentacao

-- Step 6: Add sample rules for common patterns (optional - comment out if preferring manual setup)
-- These rules help auto-categorize transactions based on description keywords
insert into public.category_rules (category_id, pattern, weight, is_regex, description) values
-- Uber/99 transactions -> Transporte
('a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'Uber|99|taxi|corrida|carro', 10, true, 'Ride-sharing and taxi services'),
-- Mercado/Market transactions -> Alimentacao
('c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f', 'mercado|supermercado|atacadao|assai|ifood|delivery', 10, true, 'Grocery and market purchases'),
-- Transport fuel -> Transporte
('a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'combustivel|gasolina|posto|petro|derivados', 8, true, 'Fuel and gas stations'),
-- Health expenses -> Saude
('3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'drogaria|farmacia|medic|consulta|hospital|clinica', 8, true, 'Healthcare and medical'),
-- Subscription payments -> Assinaturas
('d1c2b3a4-0e9f-8d7c-6b5a-4f3e2d1c0b9a', 'netflix|spotify|prime|assinatura|subscription', 8, true, 'Subscription services'),
-- Sales/Vendas -> Vendas (income)
('e1a2f64f-6d4b-4a57-8de2-8c9df4a5bf40', 'venda|vendas|salgado|produ', 8, true, 'Sales and product sales'),
-- Default rule - catch-all with lowest priority
(null, '.*', 1, true, 'Default catch-all rule');

-- Update usage counts based on existing transactions (optional)
-- This helps the system learn from historical data
update public.categories c set
    usage_count = (select count(*) from public.transactions t where t.category_id = c.id),
    last_used = (select max(t.created_at) from public.transactions t where t.category_id = c.id);

update public.subcategories s set
    usage_count = (select count(*) from public.transactions t where t.subcategory_id = s.id),
    last_used = (select max(t.created_at) from public.transactions t where t.subcategory_id = s.id);

comment on table public.category_rules is 'Rules for auto-categorization based on transaction description patterns';
comment on column public.category_rules.pattern is 'Keyword or regex pattern to match against transaction descriptions';
comment on column public.category_rules.weight is 'Priority weight - higher values match first';
comment on column public.category_rules.is_regex is 'Whether the pattern should be treated as a regex';
comment on public.subcategory_groups is 'Allows hierarchical subcategories for more granular organization';

-- View for easy category management
create or replace view public.vw_categories_full as
select
    c.id,
    c.name,
    c.type,
    c.color,
    c.icon,
    c.family_id,
    c.usage_count,
    c.last_used,
    array_agg(distinct s.name) as subcategories,
    count(s.id) as subcategory_count
from public.categories c
left join public.subcategories s on s.category_id = c.id
group by c.id, c.name, c.type, c.color, c.icon, c.family_id, c.usage_count, c.last_used
order by c.type, c.name;
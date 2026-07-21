-- Migration: Budgets, Goals, and Planning tables
-- Created: 2026-07-21

----------------------------------------------------
-- 1. Budgets (Orçamentos) - Limite por categoria
----------------------------------------------------
create table public.budgets (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    category_id uuid references public.categories on delete cascade not null,
    limit_amount numeric(12, 2) not null,
    period text default 'monthly' check (period in ('weekly', 'monthly', 'yearly')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(family_id, category_id, period)
);

----------------------------------------------------
-- 2. Goals (Metas) - Metas de economia
----------------------------------------------------
create table public.goals (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    name text not null,
    target_amount numeric(12, 2) not null,
    current_amount numeric(12, 2) default 0 not null,
    deadline date,
    icon text default 'target',
    color text default '#10b981',
    status text default 'active' check (status in ('active', 'completed', 'cancelled')) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

----------------------------------------------------
-- 3. Planning (Planejamento) - Projeções
----------------------------------------------------
create table public.planning_items (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    description text not null,
    type text check (type in ('income', 'expense')) not null,
    amount numeric(12, 2) not null,
    category_id uuid references public.categories on delete set null,
    expected_date date not null,
    recurring boolean default false not null,
    recurring_pattern text check (recurring_pattern in ('weekly', 'biweekly', 'monthly', 'yearly')),
    status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')) not null,
    created_by uuid references public.profiles on delete restrict not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

----------------------------------------------------
-- 4. RLS Policies
----------------------------------------------------
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.planning_items enable row level security;

-- Budgets policies
create policy "Membros podem ver orçamentos da família"
  on public.budgets for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros da família podem criar orçamentos"
  on public.budgets for insert to authenticated
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem atualizar orçamentos"
  on public.budgets for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem deletar orçamentos"
  on public.budgets for delete to authenticated
  using (public.is_member_of_family(family_id));

-- Goals policies
create policy "Membros podem ver metas da família"
  on public.goals for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros da família podem criar metas"
  on public.goals for insert to authenticated
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem atualizar metas"
  on public.goals for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem deletar metas"
  on public.goals for delete to authenticated
  using (public.is_member_of_family(family_id));

-- Planning policies
create policy "Membros podem ver planejamentos da família"
  on public.planning_items for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros da família podem criar planejamentos"
  on public.planning_items for insert to authenticated
  with check (
    public.is_member_of_family(family_id)
    and created_by = auth.uid()
  );

create policy "Membros da família podem atualizar planejamentos"
  on public.planning_items for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem deletar planejamentos"
  on public.planning_items for delete to authenticated
  using (public.is_member_of_family(family_id));

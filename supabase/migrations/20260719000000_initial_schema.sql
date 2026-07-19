-- Migration: Initial Schema for OrganizAI (Controle Financeiro Familiar)
-- Created: 2026-07-19

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

----------------------------------------------------
-- 1. Tablas principales (Profiles, Groups, Members)
----------------------------------------------------

-- Profiles: Representa os usuários (você e sua esposa)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Family Groups: Representa o grupo familiar
create table public.family_groups (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Family Members: Relaciona perfis com grupos familiares
create table public.family_members (
    family_id uuid references public.family_groups on delete cascade not null,
    profile_id uuid references public.profiles on delete cascade not null,
    role text default 'member' check (role in ('admin', 'member')) not null,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (family_id, profile_id)
);

----------------------------------------------------
-- 2. Categorias e Subcategorias
----------------------------------------------------

-- Categories: Categorias de receitas e despesas
create table public.categories (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade, -- null significa categoria global/padrão
    name text not null,
    type text check (type in ('income', 'expense')) not null, -- 'income' (Entrada) ou 'expense' (Saída)
    color text, -- Código hexadecimal para visualização nos gráficos
    icon text,  -- Nome do ícone (ex: 'local_dining', 'directions_car')
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subcategories: Subcategorias subordinadas
create table public.subcategories (
    id uuid default gen_random_uuid() primary key,
    category_id uuid references public.categories on delete cascade not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

----------------------------------------------------
-- 3. Transações (Lançamentos)
----------------------------------------------------

-- Transactions: Livro-caixa de despesas e receitas
create table public.transactions (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    date date default current_date not null,
    description text not null,
    category_id uuid references public.categories on delete restrict not null,
    subcategory_id uuid references public.subcategories on delete set null,
    type text check (type in ('income', 'expense')) not null,
    amount numeric(12, 2) not null,
    created_by uuid references public.profiles on delete restrict not null,
    attachment_url text, -- Link para o comprovante no Supabase Storage
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

----------------------------------------------------
-- 4. Funções auxiliares e triggers de segurança
----------------------------------------------------

-- Função de Trigger para criar perfil automaticamente ao cadastrar usuário no Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger correspondente
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função auxiliar (Security Definer) para verificar se o usuário atual pertence à família
-- É security definer para evitar recursão infinita na leitura de family_members
create or replace function public.is_member_of_family(family_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.family_members
    where family_members.family_id = $1
    and family_members.profile_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Função auxiliar (Security Definer) para verificar se o usuário é admin da família
create or replace function public.is_family_admin(family_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.family_members
    where family_members.family_id = $1
    and family_members.profile_id = auth.uid()
    and family_members.role = 'admin'
  );
end;
$$ language plpgsql security definer;

----------------------------------------------------
-- 5. Row Level Security (RLS) & Políticas
----------------------------------------------------

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.transactions enable row level security;

-- Políticas para Profiles
create policy "Qualquer usuário logado pode visualizar perfis"
  on public.profiles for select to authenticated using (true);

create policy "Usuário pode atualizar o próprio perfil"
  on public.profiles for update to authenticated 
  using (auth.uid() = id) 
  with check (auth.uid() = id);

-- Políticas para Family Groups
create policy "Membros podem ver seus grupos familiares"
  on public.family_groups for select to authenticated
  using (public.is_member_of_family(id));

create policy "Qualquer usuário logado pode criar um grupo familiar"
  on public.family_groups for insert to authenticated
  with check (true);

create policy "Apenas admins da família podem atualizar o grupo familiar"
  on public.family_groups for update to authenticated
  using (public.is_family_admin(id))
  with check (public.is_family_admin(id));

-- Políticas para Family Members
create policy "Membros podem ver membros do mesmo grupo familiar"
  on public.family_members for select to authenticated
  using (profile_id = auth.uid() or public.is_member_of_family(family_id));

create policy "Usuários podem se adicionar a um grupo familiar ou admins podem adicionar"
  on public.family_members for insert to authenticated
  with check (profile_id = auth.uid() or public.is_family_admin(family_id));

create policy "Apenas admins da família podem atualizar/remover membros"
  on public.family_members for all to authenticated
  using (public.is_family_admin(family_id));

-- Políticas para Categories
create policy "Qualquer usuário logado pode ver categorias globais ou da sua família"
  on public.categories for select to authenticated
  using (family_id is null or public.is_member_of_family(family_id));

create policy "Membros da família podem criar categorias customizadas"
  on public.categories for insert to authenticated
  with check (family_id is not null and public.is_member_of_family(family_id));

create policy "Membros da família podem alterar categorias da sua família"
  on public.categories for update to authenticated
  using (family_id is not null and public.is_member_of_family(family_id))
  with check (family_id is not null and public.is_member_of_family(family_id));

create policy "Membros da família podem deletar categorias da sua família"
  on public.categories for delete to authenticated
  using (family_id is not null and public.is_member_of_family(family_id));

-- Políticas para Subcategories
create policy "Qualquer usuário logado pode ver subcategorias"
  on public.subcategories for select to authenticated
  using (true); -- Controle real é feito via categoria pai, mas simplificado para leitura

create policy "Membros da família podem criar subcategorias se a categoria pertencer a eles"
  on public.subcategories for insert to authenticated
  with check (
    exists (
      select 1 from public.categories c
      where c.id = category_id
      and (c.family_id is null or public.is_member_of_family(c.family_id))
    )
  );

create policy "Membros da família podem atualizar/deletar subcategorias customizadas"
  on public.subcategories for all to authenticated
  using (
    exists (
      select 1 from public.categories c
      where c.id = category_id
      and c.family_id is not null
      and public.is_member_of_family(c.family_id)
    )
  );

-- Políticas para Transactions
create policy "Membros da família podem ver transações da família"
  on public.transactions for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros da família podem adicionar transações para a família"
  on public.transactions for insert to authenticated
  with check (
    public.is_member_of_family(family_id) 
    and created_by = auth.uid()
  );

create policy "Membros da família podem editar transações da família"
  on public.transactions for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem excluir transações da família"
  on public.transactions for delete to authenticated
  using (public.is_member_of_family(family_id));

----------------------------------------------------
-- 6. Dados Iniciais (Seed) de Categorias
----------------------------------------------------

-- Inserindo categorias globais (family_id is null)
-- Receitas (incomes)
insert into public.categories (id, name, type, color, icon) values
  ('e1a2f64f-6d4b-4a57-8de2-8c9df4a5bf40', 'Vendas', 'income', '#4CAF50', 'storefront'),
  ('b7c89a01-2345-6789-0123-456789abcdef', 'Trabalho Gui', 'income', '#2196F3', 'directions_car'),
  ('a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d', 'Bolsa Família', 'income', '#FFEB3B', 'payments'),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Ajuda (Parente)', 'income', '#9C27B0', 'handshake');

-- Despesas (expenses)
insert into public.categories (id, name, type, color, icon) values
  ('c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f', 'Alimentação', 'expense', '#FF5722', 'local_dining'),
  ('a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'Transporte', 'expense', '#03A9F4', 'commute'),
  ('f7e6d5c4-b3a2-1f0e-9d8c-7b6a5f4e3d2c', 'Moradia', 'expense', '#795548', 'home'),
  ('3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'Saúde', 'expense', '#E91E63', 'medical_services'),
  ('d1c2b3a4-0e9f-8d7c-6b5a-4f3e2d1c0b9a', 'Assinaturas', 'expense', '#607D8B', 'subscriptions'),
  ('5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'Pessoal', 'expense', '#E91E63', 'person'),
  ('9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c', 'Outros', 'expense', '#9E9E9E', 'more_horiz');

-- Inserindo subcategorias
insert into public.subcategories (category_id, name) values
  -- Vendas
  ('e1a2f64f-6d4b-4a57-8de2-8c9df4a5bf40', 'Salgados'),
  -- Trabalho Gui
  ('b7c89a01-2345-6789-0123-456789abcdef', 'Uber/99'),
  -- Alimentação
  ('c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f', 'Delivery'),
  -- Transporte
  ('a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'Uber/Taxi'),
  ('a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d', 'Combustível'),
  -- Pessoal
  ('5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'Lazer'),
  -- Outros
  ('9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c', 'Imprevistos');

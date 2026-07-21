-- Migration: Receipt Items for invoice/receipt scanning
-- Created: 2026-07-21

----------------------------------------------------
-- 1. Tabela de itens do recibo (receipt_items)
----------------------------------------------------

create table public.receipt_items (
    id uuid default gen_random_uuid() primary key,
    transaction_id uuid references public.transactions on delete cascade not null,
    family_id uuid references public.family_groups on delete cascade not null,
    item_name text not null,
    quantity numeric(8, 2) default 1 not null,
    unit_price numeric(12, 2) not null,
    total_price numeric(12, 2) not null,
    line_number integer, -- posição do item no recibo original
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice para buscar itens por transação rapidamente
create index idx_receipt_items_transaction_id on public.receipt_items(transaction_id);

----------------------------------------------------
-- 2. Habilitar RLS
----------------------------------------------------

alter table public.receipt_items enable row level security;

-- Políticas para Receipt Items
create policy "Membros da família podem ver itens de recibo"
  on public.receipt_items for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros da família podem criar itens de recibo"
  on public.receipt_items for insert to authenticated
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem atualizar itens de recibo"
  on public.receipt_items for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros da família podem deletar itens de recibo"
  on public.receipt_items for delete to authenticated
  using (public.is_member_of_family(family_id));

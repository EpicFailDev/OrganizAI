-- Migration: Recurring Bills (Contas Fixas/Recorrentes)
-- Created: 2026-07-21

create table public.recurring_bills (
    id uuid default gen_random_uuid() primary key,
    family_id uuid references public.family_groups on delete cascade not null,
    name text not null,
    amount numeric(12, 2) not null,
    due_day integer not null check (due_day between 1 and 31),
    category_id uuid references public.categories on delete set null,
    created_by uuid references public.profiles on delete restrict not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Pagamentos mensais: registra se a conta do mês X já foi paga
create table public.recurring_bill_payments (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references public.recurring_bills on delete cascade not null,
  month_date date not null,           -- primeiro dia do mês de referência (ex: 2026-07-01)
  paid boolean default false not null,
  paid_by uuid references public.profiles on delete set null,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(bill_id, month_date)
);

-- Index para buscar pagamentos por família rapidamente
create index idx_rbp_month on public.recurring_bill_payments(month_date);

-- RLS
alter table public.recurring_bills enable row level security;
alter table public.recurring_bill_payments enable row level security;

-- Policies: recurring_bills
create policy "Membros podem ver contas fixas da família"
  on public.recurring_bills for select to authenticated
  using (public.is_member_of_family(family_id));

create policy "Membros podem criar contas fixas"
  on public.recurring_bills for insert to authenticated
  with check (public.is_member_of_family(family_id) and created_by = auth.uid());

create policy "Membros podem atualizar contas fixas"
  on public.recurring_bills for update to authenticated
  using (public.is_member_of_family(family_id))
  with check (public.is_member_of_family(family_id));

create policy "Membros podem deletar contas fixas"
  on public.recurring_bills for delete to authenticated
  using (public.is_member_of_family(family_id));

-- Policies: recurring_bill_payments
create policy "Membros podem ver pagamentos da família"
  on public.recurring_bill_payments for select to authenticated
  using (
    exists (
      select 1 from public.recurring_bills rb
      where rb.id = bill_id and public.is_member_of_family(rb.family_id)
    )
  );

create policy "Membros podem marcar pagamentos"
  on public.recurring_bill_payments for insert to authenticated
  with check (
    exists (
      select 1 from public.recurring_bills rb
      where rb.id = bill_id and public.is_member_of_family(rb.family_id)
    )
  );

create policy "Membros podem atualizar pagamentos"
  on public.recurring_bill_payments for update to authenticated
  using (
    exists (
      select 1 from public.recurring_bills rb
      where rb.id = bill_id and public.is_member_of_family(rb.family_id)
    )
  );

create policy "Membros podem deletar pagamentos"
  on public.recurring_bill_payments for delete to authenticated
  using (
    exists (
      select 1 from public.recurring_bills rb
      where rb.id = bill_id and public.is_member_of_family(rb.family_id)
    )
  );
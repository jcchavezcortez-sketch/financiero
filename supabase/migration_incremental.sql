-- ============================================================
-- MIGRACIÓN INCREMENTAL — Financiero
-- Ejecutar en Supabase > SQL Editor DESPUÉS del schema base
-- ============================================================

-- 1. Nuevas columnas en accounts
alter table public.accounts
  add column if not exists initial_balance             numeric(12,2) not null default 0,
  add column if not exists include_in_available_balance boolean not null default true,
  add column if not exists include_in_net_worth         boolean not null default true,
  add column if not exists institution_name             text;

-- Las tarjetas de crédito no cuentan como liquidez disponible
update public.accounts
  set include_in_available_balance = false,
      include_in_net_worth = false
  where type in ('credit', 'credit_card');

-- Los ahorros protegidos cuentan para patrimonio pero no para liquidez
update public.accounts
  set include_in_available_balance = false,
      include_in_net_worth = true
  where type = 'protected_savings';

-- 2. Crear tabla liabilities (deudas)
create table if not exists public.liabilities (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  liability_type   text not null check (liability_type in ('credit_card', 'personal_debt', 'loan', 'other')),
  name             text not null,
  creditor_name    text,
  original_amount  numeric(12,2),
  current_balance  numeric(12,2) not null default 0 check (current_balance >= 0),
  due_date         date,
  minimum_payment  numeric(12,2),
  notes            text,
  status           text not null default 'active' check (status in ('active', 'paid')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3. Crear tabla financial_snapshots
create table if not exists public.financial_snapshots (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  snapshot_date             date not null default current_date,
  liquid_available_amount   numeric(12,2) not null default 0,
  protected_savings_amount  numeric(12,2) not null default 0,
  total_liabilities_amount  numeric(12,2) not null default 0,
  net_worth_amount          numeric(12,2) not null default 0,
  notes                     text,
  created_at                timestamptz not null default now()
);

-- 4. Triggers updated_at
create trigger trg_liabilities_updated_at
  before update on public.liabilities
  for each row execute function public.set_updated_at();

-- 5. RLS
alter table public.liabilities         enable row level security;
alter table public.financial_snapshots enable row level security;

create policy "Users can view own liabilities"
  on public.liabilities for select using (auth.uid() = user_id);
create policy "Users can insert own liabilities"
  on public.liabilities for insert with check (auth.uid() = user_id);
create policy "Users can update own liabilities"
  on public.liabilities for update using (auth.uid() = user_id);
create policy "Users can delete own liabilities"
  on public.liabilities for delete using (auth.uid() = user_id);

create policy "Users can view own snapshots"
  on public.financial_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert own snapshots"
  on public.financial_snapshots for insert with check (auth.uid() = user_id);

-- 6. Índices adicionales
create index if not exists idx_accounts_user_type       on public.accounts(user_id, type);
create index if not exists idx_liabilities_user_id      on public.liabilities(user_id);
create index if not exists idx_liabilities_user_status  on public.liabilities(user_id, status);
create index if not exists idx_liabilities_user_due     on public.liabilities(user_id, due_date);
create index if not exists idx_snapshots_user_id        on public.financial_snapshots(user_id);

-- ============================================================
-- Finanzas de Juani — Supabase Schema
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- Extiende auth.users con datos del perfil de la app
-- ============================================================
create table public.profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  currency    text not null default 'PEN',
  payday      integer check (payday >= 1 and payday <= 31),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================
-- TABLA: user_settings
-- Configuración financiera del usuario
-- ============================================================
create table public.user_settings (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  monthly_income       numeric(12,2),
  savings_goal         numeric(12,2),
  delivery_limit       numeric(12,2),
  subscriptions_limit  numeric(12,2),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================
-- TABLA: accounts
-- Cuentas bancarias, billeteras, efectivo, etc.
-- ============================================================
create table public.accounts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null default 'checking',
  balance     numeric(12,2) not null default 0,
  currency    text not null default 'PEN',
  color       text not null default '#7C3AED',
  icon        text not null default '🏦',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: categories
-- Categorías de gastos e ingresos (sistema + personalizadas)
-- ============================================================
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default '💸',
  color       text not null default '#9CA3AF',
  type        text not null check (type in ('expense', 'income', 'both')),
  is_custom   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: transactions
-- Movimientos financieros (gastos e ingresos)
-- ============================================================
create table public.transactions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('expense', 'income')),
  amount       numeric(12,2) not null check (amount > 0),
  description  text not null,
  merchant     text,
  category_id  uuid references public.categories(id) on delete set null,
  account_id   uuid not null references public.accounts(id) on delete restrict,
  date         date not null,
  notes        text,
  currency     text not null default 'PEN',
  source       text not null default 'manual' check (source in ('manual', 'voice', 'file_import')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: savings_goals
-- Metas de ahorro del usuario
-- ============================================================
create table public.savings_goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  target_amount   numeric(12,2) not null check (target_amount > 0),
  current_amount  numeric(12,2) not null default 0,
  deadline        date,
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLA: liabilities
-- Deudas del usuario (préstamos, tarjetas, etc.)
-- ============================================================
create table public.liabilities (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  original_amount numeric(12,2) not null check (original_amount > 0),
  current_balance numeric(12,2) not null default 0 check (current_balance >= 0),
  due_date        date,
  creditor        text,
  notes           text,
  status          text not null default 'active' check (status in ('active', 'paid')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLA: liability_payments
-- Pagos registrados contra una deuda
-- ============================================================
create table public.liability_payments (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  liability_id   uuid not null references public.liabilities(id) on delete cascade,
  account_id     uuid not null references public.accounts(id),
  transaction_id uuid references public.transactions(id),
  amount         numeric(12,2) not null check (amount > 0),
  payment_date   date not null,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TABLA: statement_imports
-- Sesiones de importación de estados de cuenta
-- ============================================================
create table public.statement_imports (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  filename       text not null,
  status         text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows     integer not null default 0,
  imported_rows  integer not null default 0,
  skipped_rows   integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ============================================================
-- TABLA: import_rows
-- Filas individuales de una importación
-- ============================================================
create table public.import_rows (
  id               uuid primary key default uuid_generate_v4(),
  import_id        uuid not null references public.statement_imports(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  raw_date         text,
  raw_description  text,
  raw_amount       text,
  parsed_amount    numeric(12,2),
  parsed_type      text check (parsed_type in ('expense', 'income')),
  is_duplicate     boolean not null default false,
  was_imported     boolean not null default false,
  transaction_id   uuid references public.transactions(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_liabilities_user_id      on public.liabilities(user_id);
create index idx_liabilities_status       on public.liabilities(user_id, status);
create index idx_liability_payments_user  on public.liability_payments(user_id);
create index idx_liability_payments_liab  on public.liability_payments(liability_id);
create index idx_liability_payments_date  on public.liability_payments(payment_date);
create index idx_accounts_user_id        on public.accounts(user_id);
create index idx_categories_user_id      on public.categories(user_id);
create index idx_transactions_user_id    on public.transactions(user_id);
create index idx_transactions_date       on public.transactions(user_id, date desc);
create index idx_transactions_account    on public.transactions(account_id);
create index idx_transactions_category   on public.transactions(category_id);
create index idx_savings_goals_user_id   on public.savings_goals(user_id);
create index idx_statement_imports_user  on public.statement_imports(user_id);
create index idx_import_rows_import_id   on public.import_rows(import_id);

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger trg_savings_goals_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

create trigger trg_liabilities_updated_at
  before update on public.liabilities
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.user_settings     enable row level security;
alter table public.accounts          enable row level security;
alter table public.categories        enable row level security;
alter table public.transactions      enable row level security;
alter table public.savings_goals     enable row level security;
alter table public.liabilities         enable row level security;
alter table public.liability_payments  enable row level security;
alter table public.statement_imports   enable row level security;
alter table public.import_rows       enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = user_id);

-- user_settings
create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- accounts
create policy "Users can view own accounts"
  on public.accounts for select using (auth.uid() = user_id);
create policy "Users can insert own accounts"
  on public.accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own accounts"
  on public.accounts for update using (auth.uid() = user_id);
create policy "Users can delete own accounts"
  on public.accounts for delete using (auth.uid() = user_id);

-- categories
create policy "Users can view own categories"
  on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories"
  on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own custom categories"
  on public.categories for update using (auth.uid() = user_id and is_custom = true);
create policy "Users can delete own custom categories"
  on public.categories for delete using (auth.uid() = user_id and is_custom = true);

-- transactions
create policy "Users can view own transactions"
  on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions"
  on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions"
  on public.transactions for delete using (auth.uid() = user_id);

-- savings_goals
create policy "Users can view own goals"
  on public.savings_goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on public.savings_goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals"
  on public.savings_goals for delete using (auth.uid() = user_id);

-- liabilities
create policy "Users can view own liabilities"
  on public.liabilities for select using (auth.uid() = user_id);
create policy "Users can insert own liabilities"
  on public.liabilities for insert with check (auth.uid() = user_id);
create policy "Users can update own liabilities"
  on public.liabilities for update using (auth.uid() = user_id);
create policy "Users can delete own liabilities"
  on public.liabilities for delete using (auth.uid() = user_id);

-- liability_payments
create policy "Users can view own liability payments"
  on public.liability_payments for select using (auth.uid() = user_id);
create policy "Users can insert own liability payments"
  on public.liability_payments for insert with check (auth.uid() = user_id);
create policy "Users can update own liability payments"
  on public.liability_payments for update using (auth.uid() = user_id);
create policy "Users can delete own liability payments"
  on public.liability_payments for delete using (auth.uid() = user_id);

-- statement_imports
create policy "Users can view own imports"
  on public.statement_imports for select using (auth.uid() = user_id);
create policy "Users can insert own imports"
  on public.statement_imports for insert with check (auth.uid() = user_id);

-- import_rows
create policy "Users can view own import rows"
  on public.import_rows for select using (auth.uid() = user_id);
create policy "Users can insert own import rows"
  on public.import_rows for insert with check (auth.uid() = user_id);
create policy "Users can update own import rows"
  on public.import_rows for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: seed de categorías por defecto para nuevos usuarios
-- Se llama desde el onboarding de la app
-- ============================================================
create or replace function public.seed_default_categories(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.categories (user_id, name, icon, color, type, is_custom) values
    -- Gastos
    (p_user_id, 'Alimentación',       '🍽️',  '#F97316', 'expense', false),
    (p_user_id, 'Supermercado',        '🛒',   '#EAB308', 'expense', false),
    (p_user_id, 'Transporte',          '🚗',   '#3B82F6', 'expense', false),
    (p_user_id, 'Entretenimiento',     '🎬',   '#A855F7', 'expense', false),
    (p_user_id, 'Salud',               '💊',   '#EF4444', 'expense', false),
    (p_user_id, 'Educación',           '📚',   '#6366F1', 'expense', false),
    (p_user_id, 'Ropa',                '👗',   '#EC4899', 'expense', false),
    (p_user_id, 'Hogar',               '🏠',   '#14B8A6', 'expense', false),
    (p_user_id, 'Tecnología',          '💻',   '#8B5CF6', 'expense', false),
    (p_user_id, 'Viajes',              '✈️',  '#06B6D4', 'expense', false),
    (p_user_id, 'Deporte',             '🏋️',  '#84CC16', 'expense', false),
    (p_user_id, 'Belleza',             '💅',   '#F43F5E', 'expense', false),
    (p_user_id, 'Mascotas',            '🐾',   '#D97706', 'expense', false),
    (p_user_id, 'Regalos',             '🎁',   '#7C3AED', 'expense', false),
    (p_user_id, 'Servicios',           '⚡',   '#64748B', 'expense', false),
    (p_user_id, 'Otros gastos',        '💸',   '#9CA3AF', 'expense', false),
    -- Ingresos
    (p_user_id, 'Sueldo',              '💼',   '#10B981', 'income',  false),
    (p_user_id, 'Freelance',           '💻',   '#6366F1', 'income',  false),
    (p_user_id, 'Inversiones',         '📈',   '#F59E0B', 'income',  false),
    (p_user_id, 'Transferencias',      '💳',   '#3B82F6', 'income',  false),
    (p_user_id, 'Alquiler',            '🏘️',  '#14B8A6', 'income',  false),
    (p_user_id, 'Otros ingresos',      '💰',   '#84CC16', 'income',  false);
end;
$$;

-- ============================================================
-- MIGRACIÓN INCREMENTAL — Ejecutar DESPUÉS del schema.sql original
-- Finanzas de Juani — v2
-- ============================================================

-- ── 1. Actualizar tabla accounts ─────────────────────────────

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_type        text NOT NULL DEFAULT 'debit',
  ADD COLUMN IF NOT EXISTS initial_balance     numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS include_in_available_balance boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_in_net_worth         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS institution_name    text;

-- Migrar valores existentes de type → account_type
UPDATE public.accounts SET account_type = CASE
  WHEN type = 'checking'   THEN 'debit'
  WHEN type = 'savings'    THEN 'savings'
  WHEN type = 'digital'    THEN 'wallet'
  WHEN type = 'cash'       THEN 'cash'
  WHEN type = 'credit'     THEN 'credit_card'
  WHEN type = 'investment' THEN 'other'
  ELSE 'debit'
END;

-- Ajustar flags según el tipo
UPDATE public.accounts SET
  include_in_available_balance = CASE
    WHEN account_type IN ('debit', 'savings', 'cash', 'wallet', 'other') THEN true
    ELSE false
  END,
  include_in_net_worth = CASE
    WHEN account_type IN ('debit', 'savings', 'protected_savings', 'cash', 'wallet', 'other') THEN true
    ELSE false
  END;

-- Constraint de valores válidos
ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_account_type_check
  CHECK (account_type IN ('debit', 'savings', 'protected_savings', 'cash', 'wallet', 'credit_card', 'other'));

-- ── 2. Crear tabla liabilities ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.liabilities (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liability_type   text NOT NULL CHECK (liability_type IN ('credit_card', 'personal_debt', 'loan', 'other')),
  name             text NOT NULL,
  creditor_name    text,
  original_amount  numeric(12,2),
  current_balance  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  due_date         date,
  minimum_payment  numeric(12,2),
  notes            text,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Crear tabla financial_snapshots ────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_snapshots (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date             date NOT NULL DEFAULT CURRENT_DATE,
  liquid_available_amount   numeric(12,2) DEFAULT 0,
  protected_savings_amount  numeric(12,2) DEFAULT 0,
  total_liabilities_amount  numeric(12,2) DEFAULT 0,
  net_worth_amount          numeric(12,2) DEFAULT 0,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Triggers updated_at ────────────────────────────────────

DROP TRIGGER IF EXISTS trg_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER trg_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. RLS para nuevas tablas ─────────────────────────────────

ALTER TABLE public.liabilities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- liabilities
DROP POLICY IF EXISTS "Users can view own liabilities"   ON public.liabilities;
DROP POLICY IF EXISTS "Users can insert own liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can update own liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can delete own liabilities" ON public.liabilities;

CREATE POLICY "Users can view own liabilities"
  ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities"
  ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities"
  ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities"
  ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- financial_snapshots
DROP POLICY IF EXISTS "Users can view own snapshots"   ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.financial_snapshots;

CREATE POLICY "Users can view own snapshots"
  ON public.financial_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots"
  ON public.financial_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 6. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_accounts_user_account_type
  ON public.accounts(user_id, account_type);

CREATE INDEX IF NOT EXISTS idx_liabilities_user_id
  ON public.liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_status
  ON public.liabilities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_liabilities_user_due_date
  ON public.liabilities(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user_id
  ON public.financial_snapshots(user_id);

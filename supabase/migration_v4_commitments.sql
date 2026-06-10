-- ============================================================
-- Migration v4: Monthly commitments (gastos fijos / compromisos)
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. monthly_commitments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.monthly_commitments (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  commitment_type       text NOT NULL CHECK (commitment_type IN (
    'rent',
    'utility',
    'subscription',
    'insurance',
    'debt_minimum',
    'credit_card_minimum',
    'loan_installment',
    'savings_target',
    'other'
  )),
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL DEFAULT 'PEN',
  due_day               integer CHECK (due_day BETWEEN 1 AND 31),
  category_id           uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  suggested_account_id  uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  liability_id          uuid REFERENCES public.liabilities(id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  starts_on             date,
  ends_on               date,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 2. commitment_month_logs ──────────────────────────────────────────────────
-- period_month = primer día del mes (ej. '2026-06-01')
-- status 'pending' y 'overdue' se calculan, no se almacenan

CREATE TABLE IF NOT EXISTS public.commitment_month_logs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id         uuid NOT NULL REFERENCES public.monthly_commitments(id) ON DELETE CASCADE,
  period_month          date NOT NULL,
  status                text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'skipped')),
  paid_amount           numeric(12,2),
  paid_date             date,
  transaction_id        uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  liability_payment_id  uuid REFERENCES public.liability_payments(id) ON DELETE SET NULL,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Único log por compromiso por mes
CREATE UNIQUE INDEX IF NOT EXISTS idx_commitment_month_logs_unique
  ON public.commitment_month_logs (commitment_id, period_month);

-- ── 3. Agregar commitment_id a transactions ───────────────────────────────────

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS commitment_id uuid
  REFERENCES public.monthly_commitments(id) ON DELETE SET NULL;

-- ── 4. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_monthly_commitments_user_id
  ON public.monthly_commitments(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_commitments_user_active
  ON public.monthly_commitments(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_monthly_commitments_user_due_day
  ON public.monthly_commitments(user_id, due_day);

CREATE INDEX IF NOT EXISTS idx_commitment_month_logs_user
  ON public.commitment_month_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_commitment_month_logs_period
  ON public.commitment_month_logs(user_id, period_month);

CREATE INDEX IF NOT EXISTS idx_commitment_month_logs_commitment_period
  ON public.commitment_month_logs(user_id, commitment_id, period_month);

CREATE INDEX IF NOT EXISTS idx_transactions_commitment_id
  ON public.transactions(commitment_id);

-- ── 5. Trigger updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_monthly_commitments_updated_at ON public.monthly_commitments;
CREATE TRIGGER trg_monthly_commitments_updated_at
  BEFORE UPDATE ON public.monthly_commitments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.monthly_commitments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_month_logs ENABLE ROW LEVEL SECURITY;

-- monthly_commitments
DROP POLICY IF EXISTS "Users can view own commitments"   ON public.monthly_commitments;
DROP POLICY IF EXISTS "Users can insert own commitments" ON public.monthly_commitments;
DROP POLICY IF EXISTS "Users can update own commitments" ON public.monthly_commitments;
DROP POLICY IF EXISTS "Users can delete own commitments" ON public.monthly_commitments;

CREATE POLICY "Users can view own commitments"
  ON public.monthly_commitments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own commitments"
  ON public.monthly_commitments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own commitments"
  ON public.monthly_commitments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own commitments"
  ON public.monthly_commitments FOR DELETE USING (auth.uid() = user_id);

-- commitment_month_logs
DROP POLICY IF EXISTS "Users can view own commitment logs"   ON public.commitment_month_logs;
DROP POLICY IF EXISTS "Users can insert own commitment logs" ON public.commitment_month_logs;
DROP POLICY IF EXISTS "Users can update own commitment logs" ON public.commitment_month_logs;
DROP POLICY IF EXISTS "Users can delete own commitment logs" ON public.commitment_month_logs;

CREATE POLICY "Users can view own commitment logs"
  ON public.commitment_month_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own commitment logs"
  ON public.commitment_month_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own commitment logs"
  ON public.commitment_month_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own commitment logs"
  ON public.commitment_month_logs FOR DELETE USING (auth.uid() = user_id);

-- ── 7. Bonus: enforce_credit_card_flags trigger ───────────────────────────────
-- Garantiza que cuentas tipo credit_card nunca sumen a liquidez ni patrimonio.

CREATE OR REPLACE FUNCTION public.enforce_credit_card_flags()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'credit_card' THEN
    NEW.include_in_available_balance := false;
    NEW.include_in_net_worth := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_credit_card_flags ON public.accounts;
CREATE TRIGGER trg_enforce_credit_card_flags
  BEFORE INSERT OR UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_credit_card_flags();

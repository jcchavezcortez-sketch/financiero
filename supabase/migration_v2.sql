-- ============================================================
-- Migration v2: Integrated movement types
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- ── 0. Extension ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Función set_updated_at (segura si ya existe) ───────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 2. accounts: columnas adicionales ─────────────────────────────────────────
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS initial_balance     numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS include_in_available_balance boolean NOT NULL DEFAULT true;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS include_in_net_worth          boolean NOT NULL DEFAULT true;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS institution_name              text;

-- Ajustar flags según tipo de cuenta existente
UPDATE public.accounts SET include_in_available_balance = false, include_in_net_worth = false
  WHERE type = 'credit_card' AND include_in_available_balance = true;
UPDATE public.accounts SET include_in_available_balance = false, include_in_net_worth = true
  WHERE type = 'protected_savings' AND include_in_available_balance = true;

-- ── 3. liabilities: asegurar columnas ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.liabilities (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liability_type   text NOT NULL DEFAULT 'other'
                   CHECK (liability_type IN ('credit_card','personal_debt','loan','other')),
  name             text NOT NULL,
  creditor_name    text,
  original_amount  numeric(12,2),
  current_balance  numeric(12,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  due_date         date,
  minimum_payment  numeric(12,2),
  notes            text,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paid')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS liability_type  text;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS creditor_name   text;
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS original_amount numeric(12,2);
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS minimum_payment numeric(12,2);

-- Si existe columna "creditor" (versión anterior), mover datos a creditor_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='liabilities' AND column_name='creditor'
  ) THEN
    UPDATE public.liabilities SET creditor_name = creditor WHERE creditor_name IS NULL;
  END IF;
END;
$$;

-- Asegurar liability_type tiene valor
UPDATE public.liabilities SET liability_type = 'other' WHERE liability_type IS NULL;

-- ── 4. transactions: movement_type ───────────────────────────────────────────
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS movement_type text;

-- Poblar movement_type para filas existentes
UPDATE public.transactions SET movement_type = type WHERE movement_type IS NULL;

-- NOT NULL y default
UPDATE public.transactions SET movement_type = 'expense' WHERE movement_type IS NULL;
ALTER TABLE public.transactions ALTER COLUMN movement_type SET DEFAULT 'expense';
ALTER TABLE public.transactions ALTER COLUMN movement_type SET NOT NULL;

-- Constraint (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_movement_type_check') THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_movement_type_check
    CHECK (movement_type IN (
      'income','expense','transfer','debt_payment',
      'credit_card_purchase','balance_adjustment','savings_allocation'
    ));
  END IF;
END;
$$;

-- ── 5. transactions: columnas nuevas ─────────────────────────────────────────
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS from_account_id       uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS to_account_id         uuid REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS liability_id          uuid REFERENCES public.liabilities(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS related_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS affects_monthly_income  boolean;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS affects_monthly_expense boolean;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS affects_available_balance boolean;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS affects_net_worth        boolean;

-- Poblar flags para filas existentes (solo donde todavía son NULL)
UPDATE public.transactions
SET
  affects_monthly_income   = (movement_type = 'income'),
  affects_monthly_expense  = (movement_type IN ('expense','credit_card_purchase')),
  affects_available_balance = (movement_type NOT IN ('credit_card_purchase','balance_adjustment')),
  affects_net_worth         = (movement_type NOT IN ('transfer','savings_allocation','balance_adjustment'))
WHERE affects_monthly_income IS NULL;

-- Defaults y NOT NULL
ALTER TABLE public.transactions ALTER COLUMN affects_monthly_income   SET DEFAULT false;
ALTER TABLE public.transactions ALTER COLUMN affects_monthly_expense  SET DEFAULT false;
ALTER TABLE public.transactions ALTER COLUMN affects_available_balance SET DEFAULT true;
ALTER TABLE public.transactions ALTER COLUMN affects_net_worth         SET DEFAULT true;
ALTER TABLE public.transactions ALTER COLUMN affects_monthly_income   SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN affects_monthly_expense  SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN affects_available_balance SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN affects_net_worth         SET NOT NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_movement_type ON public.transactions(user_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_transactions_liability     ON public.transactions(liability_id);

-- ── 6. liability_payments: crear si no existe ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.liability_payments (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liability_id   uuid NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  account_id     uuid REFERENCES public.accounts(id),
  transaction_id uuid REFERENCES public.transactions(id),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date   date NOT NULL,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liability_payments_user ON public.liability_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_liab ON public.liability_payments(liability_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_date ON public.liability_payments(payment_date);

-- ── 7. financial_snapshots: crear si no existe ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_snapshots (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date            date NOT NULL DEFAULT CURRENT_DATE,
  liquid_available_amount  numeric(12,2) NOT NULL DEFAULT 0,
  protected_savings_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_liabilities_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_worth_amount         numeric(12,2) NOT NULL DEFAULT 0,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user ON public.financial_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON public.financial_snapshots(user_id, snapshot_date DESC);

-- ── 8. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.liabilities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

-- liabilities policies
DROP POLICY IF EXISTS "Users can view own liabilities"    ON public.liabilities;
DROP POLICY IF EXISTS "Users can insert own liabilities"  ON public.liabilities;
DROP POLICY IF EXISTS "Users can update own liabilities"  ON public.liabilities;
DROP POLICY IF EXISTS "Users can delete own liabilities"  ON public.liabilities;
CREATE POLICY "Users can view own liabilities"   ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- liability_payments policies
DROP POLICY IF EXISTS "Users can view own liability payments"   ON public.liability_payments;
DROP POLICY IF EXISTS "Users can insert own liability payments" ON public.liability_payments;
DROP POLICY IF EXISTS "Users can update own liability payments" ON public.liability_payments;
DROP POLICY IF EXISTS "Users can delete own liability payments" ON public.liability_payments;
CREATE POLICY "Users can view own liability payments"   ON public.liability_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own liability payments" ON public.liability_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own liability payments" ON public.liability_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own liability payments" ON public.liability_payments FOR DELETE USING (auth.uid() = user_id);

-- financial_snapshots policies
DROP POLICY IF EXISTS "Users can view own snapshots"   ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON public.financial_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON public.financial_snapshots;
CREATE POLICY "Users can view own snapshots"   ON public.financial_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON public.financial_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snapshots" ON public.financial_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snapshots" ON public.financial_snapshots FOR DELETE USING (auth.uid() = user_id);

-- ── 9. Trigger updated_at para liabilities ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_liabilities_updated_at ON public.liabilities;
CREATE TRIGGER trg_liabilities_updated_at
  BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 10. Función: ensure_debt_category ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_debt_category(p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.categories
    WHERE user_id = p_user_id AND name = 'Deudas' AND type = 'expense'
    LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.categories(user_id, name, icon, color, type, is_custom)
    VALUES (p_user_id, 'Deudas', '💳', '#EF4444', 'expense', true)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

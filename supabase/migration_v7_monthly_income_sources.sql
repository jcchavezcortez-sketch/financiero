-- ============================================================
-- Migration v7: Monthly income sources tracking
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. monthly_income_sources ─────────────────────────────────────────────
-- Expected recurring income (salary, freelance, etc.)

CREATE TABLE IF NOT EXISTS public.monthly_income_sources (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL DEFAULT 'PEN',
  source_type           text NOT NULL CHECK (source_type IN (
    'salary',
    'freelance',
    'investment',
    'transfer',
    'rental',
    'other'
  )),
  expected_day          integer CHECK (expected_day BETWEEN 1 AND 31),
  expected_account_id   uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id           uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 2. monthly_income_logs ────────────────────────────────────────────────
-- Track when income was received (for each month)
-- period_month = primer día del mes (ej. '2026-06-01')

CREATE TABLE IF NOT EXISTS public.monthly_income_logs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id      uuid NOT NULL REFERENCES public.monthly_income_sources(id) ON DELETE CASCADE,
  period_month          date NOT NULL,
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'skipped')),
  received_amount       numeric(12,2),
  received_date         date,
  transaction_id        uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Unique log per income source per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_income_logs_unique
  ON public.monthly_income_logs (income_source_id, period_month);

-- ── 3. Índices ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_monthly_income_sources_user_id
  ON public.monthly_income_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_income_sources_user_active
  ON public.monthly_income_sources(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_monthly_income_sources_user_expected_day
  ON public.monthly_income_sources(user_id, expected_day);

CREATE INDEX IF NOT EXISTS idx_monthly_income_logs_user
  ON public.monthly_income_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_monthly_income_logs_period
  ON public.monthly_income_logs(user_id, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_income_logs_source_period
  ON public.monthly_income_logs(income_source_id, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_income_logs_status
  ON public.monthly_income_logs(user_id, status);

-- ── 4. Trigger updated_at ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_monthly_income_sources_updated_at ON public.monthly_income_sources;
CREATE TRIGGER trg_monthly_income_sources_updated_at
  BEFORE UPDATE ON public.monthly_income_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_monthly_income_logs_updated_at ON public.monthly_income_logs;
CREATE TRIGGER trg_monthly_income_logs_updated_at
  BEFORE UPDATE ON public.monthly_income_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE public.monthly_income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_monthly_income_sources_select ON public.monthly_income_sources;
CREATE POLICY rls_monthly_income_sources_select
  ON public.monthly_income_sources FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_sources_insert ON public.monthly_income_sources;
CREATE POLICY rls_monthly_income_sources_insert
  ON public.monthly_income_sources FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_sources_update ON public.monthly_income_sources;
CREATE POLICY rls_monthly_income_sources_update
  ON public.monthly_income_sources FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_sources_delete ON public.monthly_income_sources;
CREATE POLICY rls_monthly_income_sources_delete
  ON public.monthly_income_sources FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE public.monthly_income_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_monthly_income_logs_select ON public.monthly_income_logs;
CREATE POLICY rls_monthly_income_logs_select
  ON public.monthly_income_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_logs_insert ON public.monthly_income_logs;
CREATE POLICY rls_monthly_income_logs_insert
  ON public.monthly_income_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_logs_update ON public.monthly_income_logs;
CREATE POLICY rls_monthly_income_logs_update
  ON public.monthly_income_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_monthly_income_logs_delete ON public.monthly_income_logs;
CREATE POLICY rls_monthly_income_logs_delete
  ON public.monthly_income_logs FOR DELETE
  USING (user_id = auth.uid());

-- ── 6. RPC: get_monthly_income_summary ─────────────────────────────────
-- Returns expected and received income for current month

CREATE OR REPLACE FUNCTION public.get_monthly_income_summary()
RETURNS TABLE (
  expected_total numeric,
  received_total numeric,
  pending_total numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_current_month date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::date;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN mis.is_active THEN mis.amount ELSE 0 END), 0) AS expected_total,
    COALESCE(SUM(CASE WHEN mil.status = 'received' THEN COALESCE(mil.received_amount, mis.amount) ELSE 0 END), 0) AS received_total,
    COALESCE(SUM(CASE WHEN mil.status = 'pending' THEN mis.amount ELSE 0 END), 0) AS pending_total
  FROM public.monthly_income_sources mis
  LEFT JOIN public.monthly_income_logs mil
    ON mis.id = mil.income_source_id
    AND mil.period_month = v_current_month
  WHERE mis.user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_income_summary() TO authenticated;

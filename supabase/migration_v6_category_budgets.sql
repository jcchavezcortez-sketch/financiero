-- ============================================================
-- Migration v6: Category budgets for spending limits
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table: category_budgets ───────────────────────────────────────────────────
-- Monthly spending limit for each category per user

CREATE TABLE IF NOT EXISTS public.category_budgets (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id         uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit       numeric(12,2) NOT NULL CHECK (monthly_limit > 0),
  currency            text NOT NULL DEFAULT 'PEN',
  alert_threshold     numeric(3,0) NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 0 AND 100),
  is_active           boolean NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique budget per user per category
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_budgets_unique
  ON public.category_budgets (user_id, category_id);

-- ── Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id
  ON public.category_budgets(user_id);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user_active
  ON public.category_budgets(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_category_budgets_category_id
  ON public.category_budgets(category_id);

-- ── Trigger updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_category_budgets_updated_at ON public.category_budgets;
CREATE TRIGGER trg_category_budgets_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_category_budgets_select ON public.category_budgets;
CREATE POLICY rls_category_budgets_select
  ON public.category_budgets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS rls_category_budgets_insert ON public.category_budgets;
CREATE POLICY rls_category_budgets_insert
  ON public.category_budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_category_budgets_update ON public.category_budgets;
CREATE POLICY rls_category_budgets_update
  ON public.category_budgets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rls_category_budgets_delete ON public.category_budgets;
CREATE POLICY rls_category_budgets_delete
  ON public.category_budgets FOR DELETE
  USING (user_id = auth.uid());

-- ── RPC: get_category_budget_spending ──────────────────────────────────────
-- Returns current month spending for a category, along with budget info

CREATE OR REPLACE FUNCTION public.get_category_budget_spending(
  p_category_id uuid
)
RETURNS TABLE (
  budget_id uuid,
  monthly_limit numeric,
  current_spending numeric,
  percentage_used numeric,
  is_over_budget boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_budget_id uuid;
  v_monthly_limit numeric;
  v_current_spending numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get budget for this category
  SELECT id, monthly_limit INTO v_budget_id, v_monthly_limit
  FROM public.category_budgets
  WHERE user_id = v_user_id AND category_id = p_category_id AND is_active = true
  LIMIT 1;

  -- If no budget exists, return null
  IF v_budget_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate current month spending (expenses only)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_current_spending
  FROM public.transactions
  WHERE user_id = v_user_id
    AND category_id = p_category_id
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

  RETURN QUERY SELECT
    v_budget_id,
    v_monthly_limit,
    v_current_spending,
    CASE WHEN v_monthly_limit > 0 THEN (v_current_spending / v_monthly_limit * 100) ELSE 0 END,
    v_current_spending > v_monthly_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_category_budget_spending(uuid) TO authenticated;

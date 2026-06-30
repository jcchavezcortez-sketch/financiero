-- ============================================================
-- Migration v5: Safe data deletion for user reset
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

-- ── Function: delete_all_user_data ─────────────────────────────────────────
-- Deletes all financial data for a user WITHOUT deleting the auth.users row.
-- Deletes in correct order to respect foreign key constraints.
-- Atomic: all or nothing.

CREATE OR REPLACE FUNCTION public.delete_all_user_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete in dependency order (reverse of creation)
  -- 1. commitment_month_logs (no FKs to transactions, safe to delete first)
  DELETE FROM public.commitment_month_logs WHERE user_id = v_user_id;

  -- 2. liability_payments (references transactions via transaction_id)
  DELETE FROM public.liability_payments WHERE user_id = v_user_id;

  -- 3. transactions (references accounts, liabilities, categories, commitments)
  DELETE FROM public.transactions WHERE user_id = v_user_id;

  -- 4. monthly_commitments (references liabilities, accounts, categories)
  DELETE FROM public.monthly_commitments WHERE user_id = v_user_id;

  -- 5. liabilities (references accounts via linked_account_id)
  DELETE FROM public.liabilities WHERE user_id = v_user_id;

  -- 6. accounts
  DELETE FROM public.accounts WHERE user_id = v_user_id;

  -- 7. category_budgets (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='category_budgets') THEN
    DELETE FROM public.category_budgets WHERE user_id = v_user_id;
  END IF;

  -- 8. monthly_income_sources (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monthly_income_sources') THEN
    DELETE FROM public.monthly_income_sources WHERE user_id = v_user_id;
  END IF;

  -- 9. monthly_income_logs (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='monthly_income_logs') THEN
    DELETE FROM public.monthly_income_logs WHERE user_id = v_user_id;
  END IF;

  -- 10. financial_snapshots
  DELETE FROM public.financial_snapshots WHERE user_id = v_user_id;

  -- 11. savings_goals
  DELETE FROM public.savings_goals WHERE user_id = v_user_id;

  -- 12. statement_imports and import_rows
  DELETE FROM public.import_rows WHERE user_id = v_user_id;
  DELETE FROM public.statement_imports WHERE user_id = v_user_id;

  -- Categories are kept (user-created ones have is_custom=true, system ones are shared)
  -- We only delete custom categories specific to this user
  DELETE FROM public.categories WHERE user_id = v_user_id AND is_custom = true;

  -- User profile and settings are kept so user can still login and reconfigure
  -- (but they could be reset if needed in a future version)

END;
$$;

-- ── Grant execute to authenticated users ───────────────────────────────────
GRANT EXECUTE ON FUNCTION public.delete_all_user_data() TO authenticated;

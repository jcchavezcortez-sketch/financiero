-- ============================================================
-- Migration v3: Credit card support
-- Incremental / idempotente — seguro de ejecutar múltiples veces
-- Ejecutar en: Supabase > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. accounts: columnas para tarjetas de crédito ───────────────────────────
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS credit_limit         numeric(12,2);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS statement_closing_day integer CHECK (statement_closing_day BETWEEN 1 AND 31);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS payment_due_day      integer CHECK (payment_due_day BETWEEN 1 AND 31);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS card_network         text CHECK (card_network IN ('Visa','Mastercard','Amex','Diners','Otra'));
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS last_four_digits     text CHECK (char_length(last_four_digits) = 4);

-- Asegurar que tarjetas existentes no cuenten como liquidez ni patrimonio
UPDATE public.accounts
SET include_in_available_balance = false, include_in_net_worth = false
WHERE type = 'credit_card'
  AND (include_in_available_balance = true OR include_in_net_worth = true);

-- ── 2. liabilities: linked_account_id ────────────────────────────────────────
ALTER TABLE public.liabilities ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_liabilities_linked_account ON public.liabilities(linked_account_id);

-- ── 3. RLS — asegurar que todas las tablas clave tengan RLS ───────────────────
ALTER TABLE public.accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_payments  ENABLE ROW LEVEL SECURITY;

-- accounts policies
DROP POLICY IF EXISTS "Users can view own accounts"    ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts"  ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts"  ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts"  ON public.accounts;
CREATE POLICY "Users can view own accounts"   ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- transactions policies
DROP POLICY IF EXISTS "Users can view own transactions"    ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions"  ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions"  ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions"  ON public.transactions;
CREATE POLICY "Users can view own transactions"   ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

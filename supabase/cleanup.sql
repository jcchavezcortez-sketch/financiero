-- ============================================================
-- LIMPIEZA DE DATA DE NEGOCIO — Finanzas de Juani
-- Borra SOLO datos de tablas de negocio.
-- NO borra: auth.users, tablas, policies, triggers, funciones.
-- ============================================================
-- Ejecutar en Supabase > SQL Editor > New query
-- ============================================================

-- Orden: hijos primero para respetar foreign keys

-- Tablas que pueden no existir aún (después de migración sí existen)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_rows') THEN
    DELETE FROM public.import_rows;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statement_imports') THEN
    DELETE FROM public.statement_imports;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_snapshots') THEN
    DELETE FROM public.financial_snapshots;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'liabilities') THEN
    DELETE FROM public.liabilities;
  END IF;
END $$;

-- transactions antes de savings_goals (no hay FK entre ellas, pero por orden lógico)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    DELETE FROM public.transactions;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'savings_goals') THEN
    DELETE FROM public.savings_goals;
  END IF;
END $$;

-- accounts después de transactions (transactions tiene FK a accounts)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    DELETE FROM public.accounts;
  END IF;
END $$;

-- categories después de transactions (transactions tiene FK a categories)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
    DELETE FROM public.categories;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    DELETE FROM public.user_settings;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DELETE FROM public.profiles;
  END IF;
END $$;

-- Confirmación
SELECT 'Limpieza completada. auth.users NO fue modificado.' AS resultado;

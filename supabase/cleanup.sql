-- ============================================================
-- SQL DE LIMPIEZA — Financiero
-- Borra SOLO data de negocio. NO toca tablas, policies,
-- triggers, funciones ni auth.users.
--
-- TRUNCATE con CASCADE borra en cascada las filas dependientes
-- (ej: import_rows cuando se trunca statement_imports).
-- RESTART IDENTITY reinicia secuencias de IDs si las hubiera.
--
-- Ejecutar en Supabase > SQL Editor cuando quieras
-- dejar la base como instalación nueva.
-- ============================================================

truncate table
  public.import_rows,
  public.statement_imports,
  public.transactions,
  public.savings_goals,
  public.financial_snapshots,
  public.liabilities,
  public.accounts,
  public.categories,
  public.user_settings,
  public.profiles
restart identity cascade;

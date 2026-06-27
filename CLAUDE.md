# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Common commands:**
```bash
npm run dev          # Next.js dev server on localhost:3000
npm run build        # TypeScript + Next.js build (no live reload)
npm run start        # Prod server (after build)
npm run lint         # ESLint (no auto-fix by default)
```

There are no tests configured yet; focus on `npm run build` to verify TypeScript and Next.js compilation.

## Stack Overview

- **Next.js 16** (App Router with Turbopack) with breaking changes from 15.x — read `node_modules/next/dist/docs/` before writing SSR code
- **TypeScript** with types auto-generated from Supabase schema (`types/database.ts`)
- **Tailwind CSS 4** + **shadcn/ui** (Radix UI + CVA)
- **Supabase** (SSR auth via `@supabase/ssr`, RLS enforced on all tables)
- **React Hook Form + Zod** for client form validation
- **Recharts** for data visualization
- **date-fns** (ES locale) for date formatting

## Architecture

### Route Structure

```
app/
  (auth)/                  # Auth pages, no layout
    login/
    register/
  (app)/                   # Authenticated pages only
    layout.tsx             # AppShell + BottomNav (mobile-first)
    dashboard/
    transactions/
    accounts/
    deudas/                # Liabilities + credit cards
    compromisos/           # Monthly commitments
    categories/
    settings/
    add/                   # Quick add screens (income, expense, transfer, etc.)
    [other pages]/
  onboarding/              # Outside (app), questionnaire flow
  layout.tsx               # Root layout (auth check redirect)
  page.tsx                 # Public landing
```

**Auth flow:** Root `layout.tsx` checks `auth.getUser()`, redirects unauthenticated to `/login`. (app) routes require auth. `/onboarding` is outside (app) to allow questionnaire before first app entry.

### Data Layer: Supabase + RLS

**Client auth:**
- `lib/supabase/client.ts` → `createClient()` returns browser client with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- All queries enforce RLS: `WHERE auth.uid() = user_id` (or equivalent foreign key)
- Row Level Security is **mandatory**; queries without RLS filters will be rejected

**Server auth (middleware/server components):**
- `lib/supabase/server.ts` (if used) for server-side operations

**Query layer:**
- All DB operations in `lib/supabase/queries.ts` as async functions
- Pattern: `export async function getFoo() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); ... }`
- Always throw descriptive errors with context (e.g., "No se pudo crear la cuenta de tarjeta: <error message>")
- Catch `PostgrestError` and wrap as `Error` instances so UI can display them

**Key entities:**
- `accounts` (checking, savings, credit cards, cash, wallets)
- `liabilities` (credit cards, personal debts, loans)
- `liability_payments` (payment history)
- `transactions` (income, expense, transfer, debt_payment, credit_card_purchase, balance_adjustment, savings_allocation, etc.)
- `categories` (user-defined or system defaults)
- `profiles` (user metadata: name, currency, payday)
- `user_settings` (monthly_income, savings_goal, etc.)
- `monthly_commitments` + `commitment_month_logs` (recurring expenses/debt minimums/savings targets)

### Credit Card Model (Dual Account + Liability)

When a user adds a credit card:
1. **Account row** (`type = 'credit_card'`, `balance = 0`, `include_in_available_balance = false`, `include_in_net_worth = false`)
2. **Liability row** (`liability_type = 'credit_card'`, `linked_account_id = account.id`, `current_balance = debt`, `status = 'active'`)

`getCreditCards()` joins accounts WHERE `type = 'credit_card'` with liabilities WHERE `linked_account_id = account.id`. If either is missing, the card is incomplete.

### Key Utilities

- `lib/utils.ts`: `cn()` (Tailwind merge), `formatCurrency()`, `formatDate()`, `getCategoryIcon()`, `capitalizeFirst()`
- `lib/finance.ts`: financial calculations (`getAvailableLiquidity()`, `getNetWorth()`, `getTotalLiabilities()`, etc.)
- `lib/constants.ts`: category definitions, account types, liability types, currencies
- `types/index.ts`: TypeScript interfaces (User, Account, Liability, Transaction, etc.)

### Component Structure

- `components/ui/` → shadcn/ui exports (Button, Input, Sheet, Select, Tabs, Dialog, etc.)
- `components/shared/` → reusable domain components (AccountCard, TransactionItem, MonthSelector, etc.)
- `components/layout/` → AppShell, BottomNav

Mobile-first design. Forms use **React Hook Form** with **Zod** schemas for validation.

## Common Patterns

### Adding a New Page

1. Create `app/(app)/newpage/page.tsx` (for authenticated users) or `app/newpage/page.tsx` (public)
2. Import `getCurrentUser()` from `lib/supabase/queries` to check auth
3. Use client components (`"use client"`) for interactivity, server components for data fetching
4. Use `useForm` + `zodResolver` for form validation

### Accessing Supabase

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
const { data } = await supabase.from("table").select("*").eq("user_id", user.id);
```

**Always include RLS checks** — PostgREST will silently return empty if RLS blocks access.

### Forms with Validation

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0),
});

const form = useForm({ resolver: zodResolver(schema) });
const onSubmit = async (data) => { /* submit */ };

<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register("name")} />
  {form.formState.errors.name && <p>{form.formState.errors.name.message}</p>}
</form>
```

### Showing Errors from Supabase

Catch `PostgrestError` and wrap as `Error`:
```typescript
const { error } = await supabase.from("...").insert(...);
if (error) throw new Error(`Failed to save: ${error.message}`);
```

UI will then catch `e instanceof Error ? e.message : "Generic error"` and display the specific error.

## Important Notes on Next.js 16

- **App Router only** — no pages/ directory
- **Server vs Client:** Use `"use client"` sparingly for interactive components; prefer server components for data fetching
- **Breaking changes from 15.x:** Always check `node_modules/next/dist/docs/` before writing SSR code (middleware, server actions, dynamic rendering, etc.)
- **Turbopack:** Enabled by default; builds fast but may have edge cases with certain imports

## Database Migrations

Migrations live in `supabase/migration_*.sql` and are idempotent (safe to run multiple times):
- `schema.sql` — base schema
- `migration_incremental.sql` — initial additions
- `migration_v2.sql` — transactions enhancements
- `migration_v3_credit_cards.sql` — credit card support
- `migration_v4_commitments.sql` — monthly commitments

**Do not make destructive changes without explicit user confirmation.** Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.

## Deployment

- **Vercel:** `main` branch → production
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, safe for browser)
- **No service_role keys** in client-side code or commits

## Development Constraints

- Do not use mock data for authenticated users; always fetch real Supabase data
- Do not hardcode API keys or secrets
- Do not use `<SelectItem value="">` (breaks Radix Select)
- RLS is not optional — all user data queries must filter by `user_id = auth.uid()`
- Git: no force-push, no rebase, no reset-author without explicit permission
- Always run `npm run build` before commit to verify TypeScript + Next.js

## Debugging

- Check browser console for client errors
- Supabase Studio → SQL Editor to test queries manually
- Enable RLS by viewing policies in Supabase console (look for "Row Level Security" toggle)
- If query returns `[]`, check RLS — likely `user_id` mismatch or missing policy

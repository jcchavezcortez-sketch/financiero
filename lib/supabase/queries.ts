import { createClient } from "./client";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];
type FinancialSnapshotRow = Database["public"]["Tables"]["financial_snapshots"]["Row"];

// Workaround: supabase-js v2.105.4 type inference resolves table types to never
// when the Database generic has mismatched View/Function/Enum shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tbl(supabase: ReturnType<typeof createClient>, name: string): any {
  return supabase.from(name as never);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await tbl(supabase, "profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data as ProfileRow | null;
}

export async function upsertProfile(values: {
  name: string;
  currency?: string;
  payday?: number | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "profiles").upsert({ user_id: user.id, ...values });
}

// ── User settings ─────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettingsRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await tbl(supabase, "user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data as UserSettingsRow | null;
}

export async function upsertUserSettings(values: {
  monthly_income?: number | null;
  savings_goal?: number | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "user_settings").upsert({ user_id: user.id, ...values });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await tbl(supabase, "accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at");
  return (data ?? []) as AccountRow[];
}

export async function insertAccount(values: {
  name: string;
  type?: string;
  account_type?: string;
  balance: number;
  initial_balance?: number;
  currency?: string;
  color?: string;
  icon?: string;
  include_in_available_balance?: boolean;
  include_in_net_worth?: boolean;
  institution_name?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const accountType = values.account_type ?? values.type ?? "debit";
  return tbl(supabase, "accounts").insert({
    user_id: user.id,
    name: values.name,
    type: accountType,
    account_type: accountType,
    balance: values.balance,
    initial_balance: values.initial_balance ?? values.balance,
    currency: values.currency ?? "PEN",
    color: values.color ?? "#7C3AED",
    icon: values.icon ?? "🏦",
    include_in_available_balance: values.include_in_available_balance ?? true,
    include_in_net_worth: values.include_in_net_worth ?? true,
    institution_name: values.institution_name ?? null,
  });
}

export async function updateAccount(id: string, values: {
  name?: string;
  balance?: number;
  account_type?: string;
  color?: string;
  icon?: string;
  include_in_available_balance?: boolean;
  include_in_net_worth?: boolean;
  institution_name?: string | null;
}) {
  const supabase = createClient();
  return tbl(supabase, "accounts")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteAccount(id: string) {
  const supabase = createClient();
  return tbl(supabase, "accounts").update({ is_active: false }).eq("id", id);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(type?: "expense" | "income"): Promise<CategoryRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = tbl(supabase, "categories")
    .select("*")
    .eq("user_id", user.id)
    .order("is_custom")
    .order("name");
  if (type) query = query.or(`type.eq.${type},type.eq.both`);
  const { data } = await query;
  return (data ?? []) as CategoryRow[];
}

export async function insertCategory(values: {
  name: string;
  icon?: string;
  color?: string;
  type: "expense" | "income";
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "categories")
    .insert({ user_id: user.id, is_custom: true, ...values });
}

export async function seedDefaultCategories() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc("seed_default_categories", { p_user_id: user.id });
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface TransactionWithRefs extends TransactionRow {
  category: { name: string; icon: string; color: string } | null;
  account: { name: string; icon: string } | null;
}

export async function getTransactions(filters?: {
  month?: number;
  year?: number;
  categoryId?: string;
  accountId?: string;
  search?: string;
}): Promise<TransactionWithRefs[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = tbl(supabase, "transactions")
    .select("*, category:categories(name, icon, color), account:accounts(name, icon)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.month !== undefined && filters?.year !== undefined) {
    const start = `${filters.year}-${String(filters.month + 1).padStart(2, "0")}-01`;
    const end = new Date(filters.year, filters.month + 1, 0)
      .toISOString()
      .split("T")[0];
    query = query.gte("date", start).lte("date", end);
  }
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.accountId) query = query.eq("account_id", filters.accountId);
  if (filters?.search) {
    query = query.ilike("description", `%${filters.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as TransactionWithRefs[];
}

export async function insertTransaction(values: {
  type: "expense" | "income";
  amount: number;
  description: string;
  merchant?: string;
  category_id?: string;
  account_id: string;
  date: string;
  notes?: string;
  currency?: string;
  source?: "manual" | "voice" | "file_import";
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "transactions").insert({ user_id: user.id, ...values });
}

export async function updateTransaction(
  id: string,
  values: Partial<{
    type: string;
    amount: number;
    description: string;
    merchant: string;
    category_id: string;
    account_id: string;
    date: string;
    notes: string;
  }>
) {
  const supabase = createClient();
  return tbl(supabase, "transactions")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  return tbl(supabase, "transactions").delete().eq("id", id);
}

// ── Liabilities ───────────────────────────────────────────────────────────────

export async function getLiabilities(): Promise<LiabilityRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await tbl(supabase, "liabilities")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as LiabilityRow[];
}

export async function insertLiability(values: {
  liability_type: string;
  name: string;
  creditor_name?: string;
  original_amount?: number;
  current_balance: number;
  due_date?: string;
  minimum_payment?: number;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "liabilities").insert({ user_id: user.id, status: "active", ...values });
}

export async function updateLiability(id: string, values: {
  name?: string;
  liability_type?: string;
  creditor_name?: string | null;
  current_balance?: number;
  due_date?: string | null;
  minimum_payment?: number | null;
  notes?: string | null;
  status?: string;
}) {
  const supabase = createClient();
  return tbl(supabase, "liabilities")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteLiability(id: string) {
  const supabase = createClient();
  return tbl(supabase, "liabilities").delete().eq("id", id);
}

// ── Financial snapshot ────────────────────────────────────────────────────────

export async function insertFinancialSnapshot(values: {
  liquid_available_amount: number;
  protected_savings_amount: number;
  total_liabilities_amount: number;
  net_worth_amount: number;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return tbl(supabase, "financial_snapshots").insert({ user_id: user.id, ...values });
}

// ── Financial overview (dashboard) ───────────────────────────────────────────

export interface FinancialOverview {
  profile: ProfileRow | null;
  settings: UserSettingsRow | null;
  accounts: AccountRow[];
  liabilities: LiabilityRow[];
  transactions: TransactionWithRefs[];
  categoryBreakdown: { categoryId: string; name: string; icon: string; color: string; total: number; count: number }[];
  dailySpending: { label: string; amount: number; date: string }[];
}

export async function getFinancialOverview(month: number, year: number): Promise<FinancialOverview> {
  const [profile, settings, accounts, liabilities, transactions] = await Promise.all([
    getProfile(),
    getUserSettings(),
    getAccounts(),
    getLiabilities(),
    getTransactions({ month, year }),
  ]);

  // Category breakdown (expenses only)
  const catMap = new Map<string, { name: string; icon: string; color: string; total: number; count: number }>();
  for (const tx of transactions.filter((t) => t.type === "expense")) {
    if (!tx.category_id) continue;
    const cat = tx.category;
    if (!cat) continue;
    const existing = catMap.get(tx.category_id);
    if (existing) {
      existing.total += tx.amount;
      existing.count += 1;
    } else {
      catMap.set(tx.category_id, { name: cat.name, icon: cat.icon, color: cat.color, total: tx.amount, count: 1 });
    }
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([id, v]) => ({ categoryId: id, ...v }))
    .sort((a, b) => b.total - a.total);

  // Daily spending last 7 days
  const today = new Date();
  const dailySpending: { label: string; amount: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("es-PE", { weekday: "short" });
    const amount = transactions
      .filter((t) => t.type === "expense" && t.date === iso)
      .reduce((s, t) => s + t.amount, 0);
    dailySpending.push({ date: iso, label, amount });
  }

  return { profile, settings, accounts, liabilities, transactions, categoryBreakdown, dailySpending };
}

// ── Legacy: getMonthlySummary (kept for backward compat) ─────────────────────

export async function getMonthlySummary(month: number, year: number) {
  const overview = await getFinancialOverview(month, year);
  const { transactions, accounts, categoryBreakdown, dailySpending } = overview;

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return {
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    totalBalance,
    transactions,
    accounts,
    categoryBreakdown,
    dailySpending,
  };
}

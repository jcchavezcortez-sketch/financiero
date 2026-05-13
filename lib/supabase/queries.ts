import { createClient } from "./client";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];

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
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
}

export async function upsertProfile(values: {
  name: string;
  currency?: string;
  payday?: number | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase
    .from("profiles")
    .upsert({ user_id: user.id, ...values });
}

// ── User settings ─────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettingsRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data;
}

export async function upsertUserSettings(values: {
  monthly_income?: number | null;
  savings_goal?: number | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...values });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at");
  return data ?? [];
}

export async function insertAccount(values: {
  name: string;
  type: string;
  balance: number;
  currency?: string;
  color?: string;
  icon?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("accounts").insert({ user_id: user.id, ...values });
}

export async function deleteAccount(id: string) {
  const supabase = createClient();
  return supabase.from("accounts").update({ is_active: false }).eq("id", id);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(type?: "expense" | "income"): Promise<CategoryRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("is_custom")
    .order("name");
  if (type) query = query.or(`type.eq.${type},type.eq.both`);
  const { data } = await query;
  return data ?? [];
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
  return supabase
    .from("categories")
    .insert({ user_id: user.id, is_custom: true, ...values });
}

export async function seedDefaultCategories() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("seed_default_categories", { p_user_id: user.id });
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

  let query = supabase
    .from("transactions")
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
  return (data ?? []) as unknown as TransactionWithRefs[];
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
  return supabase.from("transactions").insert({ user_id: user.id, ...values });
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
  return supabase
    .from("transactions")
    .update({ ...values })
    .eq("id", id);
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  return supabase.from("transactions").delete().eq("id", id);
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export async function getMonthlySummary(month: number, year: number) {
  const transactions = await getTransactions({ month, year });
  const accounts = await getAccounts();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Category breakdown
  const catMap = new Map<
    string,
    { name: string; icon: string; color: string; total: number; count: number }
  >();
  for (const tx of transactions.filter((t) => t.type === "expense")) {
    if (!tx.category_id) continue;
    const cat = tx.category;
    if (!cat) continue;
    const existing = catMap.get(tx.category_id);
    if (existing) {
      existing.total += tx.amount;
      existing.count += 1;
    } else {
      catMap.set(tx.category_id, {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        total: tx.amount,
        count: 1,
      });
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

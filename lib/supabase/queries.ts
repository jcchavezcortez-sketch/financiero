import { createClient } from "./client";
import type { Database } from "@/types/database";
import { getFinancialOverview } from "@/lib/finance";
import type { Account, Liability, FinancialOverview } from "@/types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

// ── Auth ──────────────────────────────────────────────────────────────────────

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
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  return data;
}

export async function upsertProfile(values: { name: string; currency?: string; payday?: number | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("profiles").upsert({ user_id: user.id, ...values });
}

// ── User settings ─────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettingsRow | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
  return data;
}

export async function upsertUserSettings(values: { monthly_income?: number | null; savings_goal?: number | null }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("user_settings").upsert({ user_id: user.id, ...values });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("accounts").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at");
  return data ?? [];
}

export async function insertAccount(values: {
  name: string;
  type: string;
  balance: number;
  initial_balance?: number;
  currency?: string;
  color?: string;
  icon?: string;
  include_in_available_balance?: boolean;
  include_in_net_worth?: boolean;
  institution_name?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("accounts").insert({
    user_id: user.id,
    ...values,
    initial_balance: values.initial_balance ?? values.balance,
  });
}

export async function updateAccount(
  id: string,
  values: Partial<{
    name: string; type: string; balance: number; currency: string; color: string; icon: string;
    include_in_available_balance: boolean; include_in_net_worth: boolean; institution_name: string | null;
  }>
) {
  const supabase = createClient();
  return supabase.from("accounts").update(values).eq("id", id);
}

export async function deleteAccount(id: string) {
  const supabase = createClient();
  return supabase.from("accounts").update({ is_active: false }).eq("id", id);
}

// ── Liabilities ───────────────────────────────────────────────────────────────

export async function getLiabilities(status?: "active" | "paid"): Promise<LiabilityRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase.from("liabilities").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

export async function insertLiability(values: {
  liability_type: string;
  name: string;
  creditor_name?: string | null;
  original_amount?: number | null;
  current_balance: number;
  due_date?: string | null;
  minimum_payment?: number | null;
  notes?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("liabilities").insert({ user_id: user.id, ...values });
}

export async function updateLiability(
  id: string,
  values: Partial<{
    liability_type: string; name: string; creditor_name: string | null;
    original_amount: number | null; current_balance: number; due_date: string | null;
    minimum_payment: number | null; notes: string | null; status: string;
  }>
) {
  const supabase = createClient();
  return supabase.from("liabilities").update(values).eq("id", id);
}

export async function deleteLiability(id: string) {
  const supabase = createClient();
  return supabase.from("liabilities").delete().eq("id", id);
}

// ── Financial snapshots ───────────────────────────────────────────────────────

export async function insertFinancialSnapshot(values: {
  liquid_available_amount: number;
  protected_savings_amount: number;
  total_liabilities_amount: number;
  net_worth_amount: number;
  notes?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("financial_snapshots").insert({ user_id: user.id, ...values });
}

export async function getFinancialOverviewData(): Promise<{
  accounts: AccountRow[];
  liabilities: LiabilityRow[];
  overview: FinancialOverview;
}> {
  const [accounts, liabilities] = await Promise.all([getAccounts(), getLiabilities("active")]);
  const overview = getFinancialOverview(accounts as unknown as Account[], liabilities as unknown as Liability[]);
  return { accounts, liabilities, overview };
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(type?: "expense" | "income"): Promise<CategoryRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase.from("categories").select("*").eq("user_id", user.id).order("is_custom").order("name");
  if (type) query = query.or(`type.eq.${type},type.eq.both`);
  const { data } = await query;
  return data ?? [];
}

export async function insertCategory(values: { name: string; icon?: string; color?: string; type: "expense" | "income" }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase.from("categories").insert({ user_id: user.id, is_custom: true, ...values });
}

export async function seedDefaultCategories() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("seed_default_categories", { p_user_id: user.id });
}

// ── Transactions (read) ───────────────────────────────────────────────────────

export interface TransactionWithRefs extends TransactionRow {
  category: { name: string; icon: string; color: string } | null;
  account: { name: string; icon: string } | null;
}

export async function getTransactions(filters?: {
  month?: number;
  year?: number;
  categoryId?: string;
  accountId?: string;
  movementType?: string;
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
    const end = new Date(filters.year, filters.month + 1, 0).toISOString().split("T")[0];
    query = query.gte("date", start).lte("date", end);
  }
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.accountId) query = query.eq("account_id", filters.accountId);
  if (filters?.movementType) query = query.eq("movement_type", filters.movementType);
  if (filters?.search) query = query.ilike("description", `%${filters.search}%`);

  const { data } = await query;
  return (data ?? []) as unknown as TransactionWithRefs[];
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();
  return supabase.from("transactions").delete().eq("id", id);
}

export async function updateTransaction(id: string, values: Partial<{
  type: string; movement_type: string; amount: number; description: string;
  merchant: string; category_id: string; account_id: string; date: string; notes: string;
}>) {
  const supabase = createClient();
  return supabase.from("transactions").update(values).eq("id", id);
}

// ── Movement helpers ──────────────────────────────────────────────────────────

/** Fetch a single account's balance (used inside compound operations) */
async function fetchBalance(supabase: ReturnType<typeof createClient>, accountId: string): Promise<number> {
  const { data } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
  return data?.balance ?? 0;
}

/** Increment or decrement an account's balance */
async function adjustBalance(supabase: ReturnType<typeof createClient>, accountId: string, delta: number) {
  const current = await fetchBalance(supabase, accountId);
  await supabase.from("accounts").update({ balance: current + delta }).eq("id", accountId);
}

// ── 1. createIncome ───────────────────────────────────────────────────────────

export async function createIncome(values: {
  account_id: string;
  amount: number;
  description: string;
  category_id?: string;
  date: string;
  notes?: string;
  currency?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "income",
    movement_type: "income",
    amount: values.amount,
    description: values.description,
    category_id: values.category_id ?? null,
    account_id: values.account_id,
    date: values.date,
    notes: values.notes ?? null,
    currency: values.currency ?? "PEN",
    source: "manual",
    affects_monthly_income: true,
    affects_monthly_expense: false,
    affects_available_balance: true,
    affects_net_worth: true,
  });
  if (error) throw error;

  await adjustBalance(supabase, values.account_id, values.amount);
}

// ── 2. createExpense ──────────────────────────────────────────────────────────

export async function createExpense(values: {
  account_id: string;
  amount: number;
  description: string;
  category_id?: string;
  merchant?: string;
  date: string;
  notes?: string;
  currency?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    movement_type: "expense",
    amount: values.amount,
    description: values.description,
    merchant: values.merchant ?? null,
    category_id: values.category_id ?? null,
    account_id: values.account_id,
    date: values.date,
    notes: values.notes ?? null,
    currency: values.currency ?? "PEN",
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: true,
    affects_available_balance: true,
    affects_net_worth: true,
  });
  if (error) throw error;

  await adjustBalance(supabase, values.account_id, -values.amount);
}

// ── 3. createTransfer ─────────────────────────────────────────────────────────

export async function createTransfer(values: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  date: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (values.from_account_id === values.to_account_id) throw new Error("Las cuentas origen y destino deben ser distintas");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    movement_type: "transfer",
    amount: values.amount,
    description: values.description ?? "Transferencia entre cuentas",
    account_id: values.from_account_id,
    from_account_id: values.from_account_id,
    to_account_id: values.to_account_id,
    date: values.date,
    notes: values.notes ?? null,
    currency: "PEN",
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: false,
    affects_available_balance: false,
    affects_net_worth: false,
  });
  if (error) throw error;

  await adjustBalance(supabase, values.from_account_id, -values.amount);
  await adjustBalance(supabase, values.to_account_id, values.amount);
}

// ── 4. registerLiabilityPayment ───────────────────────────────────────────────

async function getOrCreateDebtCategory(userId: string, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: existing } = await supabase
    .from("categories").select("id").eq("user_id", userId).eq("name", "Deudas").eq("type", "expense").single();
  if (existing) return existing.id;
  const { data: inserted } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: "Deudas", icon: "💳", color: "#EF4444", type: "expense", is_custom: true })
    .select("id").single();
  return inserted?.id ?? null;
}

export async function registerLiabilityPayment(values: {
  liability_id: string;
  liability_name: string;
  account_id: string;
  amount: number;
  payment_date: string;
  notes?: string | null;
  current_balance: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const categoryId = await getOrCreateDebtCategory(user.id, supabase);

  // 1. Transaction como debt_payment
  const { data: tx, error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    movement_type: "debt_payment",
    amount: values.amount,
    description: `Pago de deuda: ${values.liability_name}`,
    category_id: categoryId,
    account_id: values.account_id,
    liability_id: values.liability_id,
    date: values.payment_date,
    notes: values.notes ?? null,
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: false,
    affects_available_balance: true,
    affects_net_worth: false,
  }).select("id").single();
  if (txError) throw txError;

  // 2. Decrementar saldo de cuenta
  await adjustBalance(supabase, values.account_id, -values.amount);

  // 3. Registrar el pago
  const { error: pmtError } = await supabase.from("liability_payments").insert({
    user_id: user.id,
    liability_id: values.liability_id,
    account_id: values.account_id,
    transaction_id: tx?.id ?? null,
    amount: values.amount,
    payment_date: values.payment_date,
    notes: values.notes ?? null,
  });
  if (pmtError) throw pmtError;

  // 4. Actualizar saldo de deuda
  const newBalance = Math.max(0, values.current_balance - values.amount);
  const newStatus = newBalance === 0 ? "paid" : "active";
  const { error: liabError } = await supabase
    .from("liabilities").update({ current_balance: newBalance, status: newStatus }).eq("id", values.liability_id);
  if (liabError) throw liabError;

  return { newBalance, newStatus };
}

export async function markLiabilityPaid(id: string) {
  const supabase = createClient();
  return supabase.from("liabilities").update({ current_balance: 0, status: "paid" }).eq("id", id);
}

// ── 5. createCreditCardPurchase ───────────────────────────────────────────────

export async function createCreditCardPurchase(values: {
  liability_id: string;
  liability_name: string;
  amount: number;
  description: string;
  category_id?: string;
  date: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Cuenta fantasma: se necesita account_id en transactions.
  // Usamos la liability_id como referencia; buscamos si hay una cuenta asociada a la tarjeta.
  // Como fallback, usamos un account_id ficticio (primera cuenta del usuario).
  const { data: firstAccount } = await supabase
    .from("accounts").select("id").eq("user_id", user.id).eq("is_active", true).limit(1).single();
  const accountId = firstAccount?.id ?? "00000000-0000-0000-0000-000000000000";

  // 1. Registrar la compra como gasto mensual
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    movement_type: "credit_card_purchase",
    amount: values.amount,
    description: values.description,
    category_id: values.category_id ?? null,
    account_id: accountId,
    liability_id: values.liability_id,
    date: values.date,
    notes: values.notes ?? null,
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: true,
    affects_available_balance: false, // no baja liquidez
    affects_net_worth: true,          // sí baja patrimonio
  });
  if (txError) throw txError;

  // 2. Aumentar la deuda
  const { data: liability } = await supabase
    .from("liabilities").select("current_balance").eq("id", values.liability_id).single();
  if (liability) {
    await supabase.from("liabilities")
      .update({ current_balance: liability.current_balance + values.amount, status: "active" })
      .eq("id", values.liability_id);
  }
}

// ── 6. createBalanceAdjustment ────────────────────────────────────────────────

export async function createBalanceAdjustment(values: {
  account_id: string;
  new_balance: number;
  notes?: string;
  date: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const current = await fetchBalance(supabase, values.account_id);
  const delta = values.new_balance - current;
  if (delta === 0) return;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: delta > 0 ? "income" : "expense",
    movement_type: "balance_adjustment",
    amount: Math.abs(delta),
    description: "Ajuste de saldo",
    account_id: values.account_id,
    date: values.date,
    notes: values.notes ?? null,
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: false,
    affects_available_balance: false,
    affects_net_worth: false,
  });
  if (error) throw error;

  await supabase.from("accounts").update({ balance: values.new_balance }).eq("id", values.account_id);
}

// ── 7. createSavingsAllocation ────────────────────────────────────────────────

export async function createSavingsAllocation(values: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  notes?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (values.from_account_id === values.to_account_id) throw new Error("Las cuentas deben ser distintas");

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "expense",
    movement_type: "savings_allocation",
    amount: values.amount,
    description: "Separación a ahorro protegido",
    account_id: values.from_account_id,
    from_account_id: values.from_account_id,
    to_account_id: values.to_account_id,
    date: values.date,
    notes: values.notes ?? null,
    source: "manual",
    affects_monthly_income: false,
    affects_monthly_expense: false,
    affects_available_balance: true,
    affects_net_worth: false,
  });
  if (error) throw error;

  await adjustBalance(supabase, values.from_account_id, -values.amount);
  await adjustBalance(supabase, values.to_account_id, values.amount);
}

// ── Liability payments (read) ─────────────────────────────────────────────────

export async function getLiabilityPayments(liabilityId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("liability_payments")
    .select("*, account:accounts(name, icon)")
    .eq("user_id", user.id)
    .eq("liability_id", liabilityId)
    .order("payment_date", { ascending: false });
  return data ?? [];
}

// ── insertTransaction (legacy — mantener para voz e importación) ───────────────

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
  const isIncome = values.type === "income";
  return supabase.from("transactions").insert({
    user_id: user.id,
    movement_type: values.type,
    affects_monthly_income: isIncome,
    affects_monthly_expense: !isIncome,
    affects_available_balance: true,
    affects_net_worth: true,
    ...values,
  });
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export async function getMonthlySummary(month: number, year: number) {
  const transactions = await getTransactions({ month, year });
  const accounts = await getAccounts();

  // Ingresos reales (excluye transferencias, ajustes, etc.)
  const totalIncome = transactions
    .filter((t) => t.affects_monthly_income ?? (t.movement_type ?? t.type) === "income")
    .reduce((s, t) => s + t.amount, 0);

  // Gastos reales de consumo (excluye debt_payment, transfer, adjustment, savings)
  const totalExpenses = transactions
    .filter((t) => {
      if (t.affects_monthly_expense != null) return t.affects_monthly_expense;
      const mt = t.movement_type ?? t.type;
      return mt === "expense" || mt === "credit_card_purchase";
    })
    .reduce((s, t) => s + t.amount, 0);

  // Pagos de deuda del mes (métrica separada)
  const totalDebtPayments = transactions
    .filter((t) => (t.movement_type ?? t.type) === "debt_payment")
    .reduce((s, t) => s + t.amount, 0);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Category breakdown (solo gastos reales)
  const catMap = new Map<string, { name: string; icon: string; color: string; total: number; count: number }>();
  for (const tx of transactions) {
    const mt = tx.movement_type ?? tx.type;
    if (mt !== "expense" && mt !== "credit_card_purchase") continue;
    if (!tx.category_id || !tx.category) continue;
    const existing = catMap.get(tx.category_id);
    if (existing) { existing.total += tx.amount; existing.count += 1; }
    else catMap.set(tx.category_id, { name: tx.category.name, icon: tx.category.icon, color: tx.category.color, total: tx.amount, count: 1 });
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([id, v]) => ({ categoryId: id, ...v }))
    .sort((a, b) => b.total - a.total);

  // Daily spending last 7 days (solo gastos reales)
  const today = new Date();
  const dailySpending: { label: string; amount: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("es-PE", { weekday: "short" });
    const amount = transactions
      .filter((t) => {
        const mt = t.movement_type ?? t.type;
        return (mt === "expense" || mt === "credit_card_purchase") && t.date === iso;
      })
      .reduce((s, t) => s + t.amount, 0);
    dailySpending.push({ date: iso, label, amount });
  }

  return { totalIncome, totalExpenses, totalDebtPayments, balance: totalIncome - totalExpenses, totalBalance, transactions, accounts, categoryBreakdown, dailySpending };
}

import { createClient } from "./client";
import type { Database } from "@/types/database";
import { getFinancialOverview } from "@/lib/finance";
import type {
  Account,
  Liability,
  FinancialOverview,
  CreditCardWithLiability,
  MonthlyCommitment,
  CommitmentMonthLog,
  CommitmentWithStatus,
  CommitmentStatus,
  CommitmentType,
  MonthlyCommitmentSummary,
  FreeCashFlowSummary,
} from "@/types";
import { DEBT_COMMITMENT_TYPES, SAVINGS_COMMITMENT_TYPES } from "@/types";

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

// ── Credit card helpers ───────────────────────────────────────────────────────

export async function getCreditCards(): Promise<CreditCardWithLiability[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: accounts }, { data: liabilities }] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("type", "credit_card").eq("is_active", true).order("created_at"),
    supabase.from("liabilities").select("*").eq("user_id", user.id).eq("liability_type", "credit_card"),
  ]);

  return (accounts ?? []).map((acc) => {
    const liab = (liabilities ?? []).find((l) => l.linked_account_id === acc.id);
    return {
      account_id: acc.id,
      name: acc.name,
      institution_name: acc.institution_name ?? null,
      card_network: acc.card_network ?? null,
      last_four_digits: acc.last_four_digits ?? null,
      credit_limit: acc.credit_limit ?? null,
      statement_closing_day: acc.statement_closing_day ?? null,
      payment_due_day: acc.payment_due_day ?? null,
      color: acc.color,
      icon: acc.icon,
      liability_id: liab?.id ?? null,
      current_balance: liab?.current_balance ?? 0,
      original_amount: liab?.original_amount ?? null,
      minimum_payment: liab?.minimum_payment ?? null,
      status: liab?.status ?? "paid",
      notes: liab?.notes ?? null,
    } satisfies CreditCardWithLiability;
  });
}

export async function insertCreditCard(values: {
  name: string;
  institution_name?: string | null;
  card_network?: string | null;
  last_four_digits?: string | null;
  credit_limit?: number | null;
  current_balance: number;
  statement_closing_day?: number | null;
  payment_due_day?: number | null;
  minimum_payment?: number | null;
  notes?: string | null;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: account, error: accErr } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: values.name,
    type: "credit_card",
    balance: 0,
    initial_balance: 0,
    icon: "💳",
    color: "#EF4444",
    include_in_available_balance: false,
    include_in_net_worth: false,
    institution_name: values.institution_name ?? null,
    credit_limit: values.credit_limit ?? null,
    statement_closing_day: values.statement_closing_day ?? null,
    payment_due_day: values.payment_due_day ?? null,
    card_network: values.card_network ?? null,
    last_four_digits: values.last_four_digits ?? null,
  }).select("id").single();
  if (accErr) throw accErr;

  const { error: liabErr } = await supabase.from("liabilities").insert({
    user_id: user.id,
    liability_type: "credit_card",
    name: values.name,
    creditor_name: values.institution_name ?? null,
    current_balance: values.current_balance,
    original_amount: values.current_balance,
    minimum_payment: values.minimum_payment ?? null,
    notes: values.notes ?? null,
    status: values.current_balance > 0 ? "active" : "paid",
    linked_account_id: account.id,
  });
  if (liabErr) throw liabErr;

  return account;
}

export async function updateCreditCard(
  accountId: string,
  liabilityId: string | null,
  values: {
    name?: string;
    institution_name?: string | null;
    card_network?: string | null;
    last_four_digits?: string | null;
    credit_limit?: number | null;
    statement_closing_day?: number | null;
    payment_due_day?: number | null;
    minimum_payment?: number | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  await supabase.from("accounts").update({
    name: values.name,
    institution_name: values.institution_name ?? null,
    card_network: values.card_network ?? null,
    last_four_digits: values.last_four_digits ?? null,
    credit_limit: values.credit_limit ?? null,
    statement_closing_day: values.statement_closing_day ?? null,
    payment_due_day: values.payment_due_day ?? null,
  }).eq("id", accountId);

  if (liabilityId) {
    await supabase.from("liabilities").update({
      name: values.name,
      creditor_name: values.institution_name ?? null,
      minimum_payment: values.minimum_payment ?? null,
      notes: values.notes ?? null,
    }).eq("id", liabilityId);
  }
}

export async function deleteCreditCard(accountId: string, liabilityId: string | null) {
  const supabase = createClient();
  // Check for transactions first
  const { data: txs } = await supabase
    .from("transactions")
    .select("id")
    .eq("account_id", accountId)
    .limit(1);
  if (txs && txs.length > 0) {
    throw new Error("Esta tarjeta tiene movimientos registrados. Solo puedes desactivarla.");
  }
  await supabase.from("accounts").update({ is_active: false }).eq("id", accountId);
  if (liabilityId) {
    await supabase.from("liabilities").update({ status: "paid", current_balance: 0 }).eq("id", liabilityId);
  }
}

export async function getCreditCardSummary(month: number, year: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalDebt: 0, activeCount: 0, purchases: 0, payments: 0, cards: [] as CreditCardWithLiability[] };

  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const [cards, { data: txs }] = await Promise.all([
    getCreditCards(),
    supabase.from("transactions").select("movement_type, amount").eq("user_id", user.id).in("movement_type", ["credit_card_purchase", "debt_payment"]).gte("date", start).lte("date", end),
  ]);

  const purchases = (txs ?? []).filter((t) => t.movement_type === "credit_card_purchase").reduce((s, t) => s + t.amount, 0);
  const payments = (txs ?? []).filter((t) => t.movement_type === "debt_payment").reduce((s, t) => s + t.amount, 0);
  const totalDebt = cards.reduce((s, c) => s + c.current_balance, 0);
  const activeCount = cards.filter((c) => c.current_balance > 0).length;

  return { totalDebt, activeCount, purchases, payments, cards };
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
  credit_card_account_id?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Use the linked credit card account if provided, otherwise fall back to liability's linked account
  let accountId = values.credit_card_account_id;
  if (!accountId) {
    const { data: liab } = await supabase.from("liabilities").select("linked_account_id").eq("id", values.liability_id).single();
    accountId = liab?.linked_account_id ?? undefined;
  }
  if (!accountId) {
    const { data: firstAccount } = await supabase.from("accounts").select("id").eq("user_id", user.id).eq("is_active", true).limit(1).single();
    accountId = firstAccount?.id ?? "00000000-0000-0000-0000-000000000000";
  }

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

// ── Monthly commitments ───────────────────────────────────────────────────────

/** Returns the first day of the month for a given Date as 'YYYY-MM-01' */
export function toPeriodMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export async function getMonthlyCommitments(): Promise<MonthlyCommitment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("monthly_commitments")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("due_day", { ascending: true, nullsFirst: false })
    .order("name");
  return (data ?? []) as unknown as MonthlyCommitment[];
}

export async function insertMonthlyCommitment(values: {
  name: string;
  commitment_type: CommitmentType;
  amount: number;
  currency?: string;
  due_day?: number | null;
  category_id?: string | null;
  suggested_account_id?: string | null;
  liability_id?: string | null;
  notes?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { error } = await supabase.from("monthly_commitments").insert({
    user_id: user.id,
    ...values,
    currency: values.currency ?? "PEN",
  });
  if (error) throw error;
}

export async function updateMonthlyCommitment(
  id: string,
  values: Partial<{
    name: string;
    commitment_type: CommitmentType;
    amount: number;
    currency: string;
    due_day: number | null;
    category_id: string | null;
    suggested_account_id: string | null;
    liability_id: string | null;
    notes: string | null;
  }>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("monthly_commitments")
    .update(values)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOrDeactivateMonthlyCommitment(id: string): Promise<void> {
  const supabase = createClient();
  // Check if it has any logs — if so, deactivate instead of deleting
  const { data: logs } = await supabase
    .from("commitment_month_logs")
    .select("id")
    .eq("commitment_id", id)
    .limit(1);
  if (logs && logs.length > 0) {
    const { error } = await supabase
      .from("monthly_commitments")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("monthly_commitments")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
}

export async function getCommitmentLogs(periodMonth: string): Promise<CommitmentMonthLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("commitment_month_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("period_month", periodMonth);
  return (data ?? []) as unknown as CommitmentMonthLog[];
}

function deriveStatus(
  commitment: MonthlyCommitment,
  log: CommitmentMonthLog | null,
  periodMonth: string,
  today: Date
): CommitmentStatus {
  if (log?.status === "paid") return "paid";
  if (log?.status === "skipped") return "skipped";

  // No log: check overdue
  const [y, m] = periodMonth.split("-").map(Number);
  const periodYear = y;
  const periodMon = m - 1; // 0-indexed
  const currentYear = today.getFullYear();
  const currentMon = today.getMonth();

  // Past month with no payment
  if (periodYear < currentYear || (periodYear === currentYear && periodMon < currentMon)) {
    return "overdue";
  }
  // Current month: check due_day
  if (periodYear === currentYear && periodMon === currentMon && commitment.due_day !== null) {
    if (today.getDate() > commitment.due_day) return "overdue";
  }
  return "pending";
}

export async function getCommitmentsWithStatus(periodMonth: string): Promise<CommitmentWithStatus[]> {
  const [commitments, logs] = await Promise.all([
    getMonthlyCommitments(),
    getCommitmentLogs(periodMonth),
  ]);
  const logMap = new Map(logs.map((l) => [l.commitment_id, l]));
  const today = new Date();
  return commitments.map((c) => {
    const log = logMap.get(c.id) ?? null;
    return { ...c, log, displayStatus: deriveStatus(c, log, periodMonth, today) };
  });
}

export async function markCommitmentAsPaid(params: {
  commitmentId: string;
  commitmentType: CommitmentType;
  commitmentName: string;
  periodMonth: string;
  paidAmount: number;
  paidDate: string;
  fromAccountId: string;
  toAccountId?: string;
  liabilityId?: string;
  liabilityCurrentBalance?: number;
  categoryId?: string | null;
  notes?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (params.paidAmount <= 0) throw new Error("El monto debe ser mayor a 0");

  // Prevent duplicate log
  const { data: existing } = await supabase
    .from("commitment_month_logs")
    .select("id")
    .eq("commitment_id", params.commitmentId)
    .eq("period_month", params.periodMonth)
    .maybeSingle();
  if (existing) throw new Error("Este compromiso ya fue registrado este mes");

  let transactionId: string | null = null;
  let liabilityPaymentId: string | null = null;

  const isDebt = DEBT_COMMITMENT_TYPES.has(params.commitmentType);
  const isSavings = SAVINGS_COMMITMENT_TYPES.has(params.commitmentType);

  if (isDebt) {
    if (!params.liabilityId) throw new Error("Debes seleccionar la deuda o tarjeta a pagar");
    const categoryId = await getOrCreateDebtCategory(user.id, supabase);

    // Create debt_payment transaction
    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "expense",
      movement_type: "debt_payment",
      amount: params.paidAmount,
      description: `Pago: ${params.commitmentName}`,
      category_id: categoryId,
      account_id: params.fromAccountId,
      liability_id: params.liabilityId,
      commitment_id: params.commitmentId,
      date: params.paidDate,
      notes: params.notes ?? null,
      source: "manual",
      affects_monthly_income: false,
      affects_monthly_expense: false,
      affects_available_balance: true,
      affects_net_worth: false,
    }).select("id").single();
    if (txErr) throw txErr;
    transactionId = tx.id;

    await adjustBalance(supabase, params.fromAccountId, -params.paidAmount);

    const { data: pmtData, error: pmtErr } = await supabase.from("liability_payments").insert({
      user_id: user.id,
      liability_id: params.liabilityId,
      account_id: params.fromAccountId,
      transaction_id: transactionId,
      amount: params.paidAmount,
      payment_date: params.paidDate,
      notes: params.notes ?? null,
    }).select("id").single();
    if (pmtErr) throw pmtErr;
    liabilityPaymentId = pmtData.id;

    const currentBal = params.liabilityCurrentBalance ?? 0;
    const newBal = Math.max(0, currentBal - params.paidAmount);
    await supabase.from("liabilities")
      .update({ current_balance: newBal, status: newBal === 0 ? "paid" : "active" })
      .eq("id", params.liabilityId);

  } else if (isSavings) {
    if (!params.toAccountId) throw new Error("Debes seleccionar la cuenta de ahorro destino");

    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "expense",
      movement_type: "savings_allocation",
      amount: params.paidAmount,
      description: `Ahorro: ${params.commitmentName}`,
      account_id: params.fromAccountId,
      from_account_id: params.fromAccountId,
      to_account_id: params.toAccountId,
      commitment_id: params.commitmentId,
      date: params.paidDate,
      notes: params.notes ?? null,
      source: "manual",
      affects_monthly_income: false,
      affects_monthly_expense: false,
      affects_available_balance: true,
      affects_net_worth: false,
    }).select("id").single();
    if (txErr) throw txErr;
    transactionId = tx.id;

    await adjustBalance(supabase, params.fromAccountId, -params.paidAmount);
    await adjustBalance(supabase, params.toAccountId, params.paidAmount);

  } else {
    // Regular expense (rent, utility, subscription, insurance, other)
    const { data: tx, error: txErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "expense",
      movement_type: "expense",
      amount: params.paidAmount,
      description: params.commitmentName,
      category_id: params.categoryId ?? null,
      account_id: params.fromAccountId,
      commitment_id: params.commitmentId,
      date: params.paidDate,
      notes: params.notes ?? null,
      source: "manual",
      affects_monthly_income: false,
      affects_monthly_expense: true,
      affects_available_balance: true,
      affects_net_worth: true,
    }).select("id").single();
    if (txErr) throw txErr;
    transactionId = tx.id;

    await adjustBalance(supabase, params.fromAccountId, -params.paidAmount);
  }

  const { error: logErr } = await supabase.from("commitment_month_logs").insert({
    user_id: user.id,
    commitment_id: params.commitmentId,
    period_month: params.periodMonth,
    status: "paid",
    paid_amount: params.paidAmount,
    paid_date: params.paidDate,
    transaction_id: transactionId,
    liability_payment_id: liabilityPaymentId,
    notes: params.notes ?? null,
  });
  if (logErr) throw logErr;
}

export async function markCommitmentAsSkipped(params: {
  commitmentId: string;
  periodMonth: string;
  notes?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: existing } = await supabase
    .from("commitment_month_logs")
    .select("id")
    .eq("commitment_id", params.commitmentId)
    .eq("period_month", params.periodMonth)
    .maybeSingle();
  if (existing) throw new Error("Este compromiso ya tiene un registro este mes");

  const { error } = await supabase.from("commitment_month_logs").insert({
    user_id: user.id,
    commitment_id: params.commitmentId,
    period_month: params.periodMonth,
    status: "skipped",
    notes: params.notes ?? null,
  });
  if (error) throw error;
}

export async function getMonthlyCommitmentSummary(periodMonth: string): Promise<MonthlyCommitmentSummary> {
  const commitments = await getCommitmentsWithStatus(periodMonth);
  let total = 0, totalPaid = 0, totalPending = 0, totalOverdue = 0, totalSkipped = 0;
  let fixedExpensesPending = 0, debtMinimumsPending = 0, plannedSavingsPending = 0;
  let nextDue: CommitmentWithStatus | null = null;

  for (const c of commitments) {
    total += c.amount;
    const s = c.displayStatus;
    if (s === "paid") {
      totalPaid += c.log?.paid_amount ?? c.amount;
    } else if (s === "skipped") {
      totalSkipped += c.amount;
    } else {
      const pending = s === "pending" || s === "overdue";
      if (s === "overdue") totalOverdue += c.amount;
      else totalPending += c.amount;
      if (pending) {
        if (DEBT_COMMITMENT_TYPES.has(c.commitment_type)) debtMinimumsPending += c.amount;
        else if (SAVINGS_COMMITMENT_TYPES.has(c.commitment_type)) plannedSavingsPending += c.amount;
        else fixedExpensesPending += c.amount;
      }
    }
    if (c.displayStatus === "pending" && c.due_day !== null) {
      if (!nextDue || (nextDue.due_day ?? 99) > c.due_day) nextDue = c;
    }
  }
  return { total, totalPaid, totalPending, totalOverdue, totalSkipped, fixedExpensesPending, debtMinimumsPending, plannedSavingsPending, nextDue };
}

export async function getFreeCashFlowSummary(periodMonth: string): Promise<FreeCashFlowSummary> {
  const [accounts, liabilities, commitments] = await Promise.all([
    getAccounts(),
    getLiabilities("active"),
    getCommitmentsWithStatus(periodMonth),
  ]);

  const availableBalance = accounts
    .filter((a) => a.include_in_available_balance)
    .reduce((s, a) => s + a.balance, 0);

  const protectedSavings = accounts
    .filter((a) => !a.include_in_available_balance && a.include_in_net_worth !== false && a.type !== "credit_card")
    .reduce((s, a) => s + a.balance, 0);

  const totalDebt = liabilities.reduce((s, l) => s + l.current_balance, 0);
  const creditCardDebt = liabilities
    .filter((l) => l.liability_type === "credit_card")
    .reduce((s, l) => s + l.current_balance, 0);

  const pending = commitments.filter(
    (c) => c.displayStatus === "pending" || c.displayStatus === "overdue"
  );

  const fixedCommitmentsPending = pending
    .filter((c) => !DEBT_COMMITMENT_TYPES.has(c.commitment_type) && !SAVINGS_COMMITMENT_TYPES.has(c.commitment_type))
    .reduce((s, c) => s + c.amount, 0);
  const debtMinimumsPending = pending
    .filter((c) => DEBT_COMMITMENT_TYPES.has(c.commitment_type))
    .reduce((s, c) => s + c.amount, 0);
  const plannedSavingsPending = pending
    .filter((c) => SAVINGS_COMMITMENT_TYPES.has(c.commitment_type))
    .reduce((s, c) => s + c.amount, 0);
  const totalCommitmentsPending = fixedCommitmentsPending + debtMinimumsPending + plannedSavingsPending;
  const freeCashEstimated = availableBalance - totalCommitmentsPending;

  return {
    availableBalance,
    protectedSavings,
    totalDebt,
    creditCardDebt,
    fixedCommitmentsPending,
    debtMinimumsPending,
    plannedSavingsPending,
    totalCommitmentsPending,
    freeCashEstimated,
  };
}

// ── User data deletion ───────────────────────────────────────────────────────

export async function deleteAllUserData(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.rpc("delete_all_user_data");
  if (error) {
    console.error("[deleteAllUserData] RPC failed:", error);
    throw new Error(`No se pudieron eliminar los datos: ${error.message}`);
  }
}

// ── Category Budgets ────────────────────────────────────────────────────────

export async function getCategoryBudgets(): Promise<
  Database["public"]["Tables"]["category_budgets"]["Row"][]
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  if (error) throw new Error(`No se pudieron obtener los presupuestos: ${error.message}`);
  return data || [];
}

export async function upsertCategoryBudget(payload: {
  category_id: string;
  monthly_limit: number;
  alert_threshold?: number;
  is_active?: boolean;
  notes?: string | null;
}): Promise<Database["public"]["Tables"]["category_budgets"]["Row"]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: user.id,
        ...payload,
      },
      { onConflict: "user_id,category_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar el presupuesto: ${error.message}`);
  return data;
}

export async function deleteCategoryBudget(budgetId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", user.id);

  if (error) throw new Error(`No se pudo eliminar el presupuesto: ${error.message}`);
}

export async function getCategoryBudgetSpending(
  categoryId: string
): Promise<{
  budget_id: string;
  monthly_limit: number;
  current_spending: number;
  percentage_used: number;
  is_over_budget: boolean;
} | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase.rpc("get_category_budget_spending", {
    p_category_id: categoryId,
  });

  if (error) {
    console.error("[getCategoryBudgetSpending] RPC failed:", error);
    return null;
  }
  return data?.[0] || null;
}

// ── Monthly Income Sources ──────────────────────────────────────────────────

export async function getMonthlyIncomeSources(): Promise<
  Database["public"]["Tables"]["monthly_income_sources"]["Row"][]
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("monthly_income_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("expected_day", { ascending: true });

  if (error) throw new Error(`No se pudieron obtener las fuentes de ingresos: ${error.message}`);
  return data || [];
}

export async function upsertMonthlyIncomeSource(payload: {
  name: string;
  amount: number;
  source_type: string;
  expected_day?: number;
  expected_account_id?: string | null;
  category_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
}): Promise<Database["public"]["Tables"]["monthly_income_sources"]["Row"]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("monthly_income_sources")
    .insert({
      user_id: user.id,
      ...payload,
    })
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar la fuente de ingreso: ${error.message}`);
  return data;
}

export async function updateMonthlyIncomeSource(
  sourceId: string,
  payload: Partial<{
    name: string;
    amount: number;
    source_type: string;
    expected_day: number;
    expected_account_id: string | null;
    category_id: string | null;
    is_active: boolean;
    notes: string | null;
  }>
): Promise<Database["public"]["Tables"]["monthly_income_sources"]["Row"]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("monthly_income_sources")
    .update(payload)
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(`No se pudo actualizar la fuente de ingreso: ${error.message}`);
  return data;
}

export async function deleteMonthlyIncomeSource(sourceId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("monthly_income_sources")
    .delete()
    .eq("id", sourceId)
    .eq("user_id", user.id);

  if (error) throw new Error(`No se pudo eliminar la fuente de ingreso: ${error.message}`);
}

export async function getMonthlyIncomeLogs(periodMonth?: string): Promise<
  Database["public"]["Tables"]["monthly_income_logs"]["Row"][]
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  let query = supabase
    .from("monthly_income_logs")
    .select("*")
    .eq("user_id", user.id);

  if (periodMonth) {
    query = query.eq("period_month", periodMonth);
  }

  const { data, error } = await query.order("period_month", { ascending: false });

  if (error) throw new Error(`No se pudieron obtener los registros de ingreso: ${error.message}`);
  return data || [];
}

export async function markIncomeAsReceived(
  incomeLogId: string,
  receivedAmount: number,
  receivedDate: string,
  transactionId?: string | null
): Promise<Database["public"]["Tables"]["monthly_income_logs"]["Row"]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("monthly_income_logs")
    .update({
      status: "received",
      received_amount: receivedAmount,
      received_date: receivedDate,
      transaction_id: transactionId || null,
    })
    .eq("id", incomeLogId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(`No se pudo marcar el ingreso como recibido: ${error.message}`);
  return data;
}

export async function getMonthlyIncomeSummary(): Promise<{
  expected_total: number;
  received_total: number;
  pending_total: number;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase.rpc("get_monthly_income_summary");

  if (error) {
    console.error("[getMonthlyIncomeSummary] RPC failed:", error);
    throw new Error(`No se pudo obtener el resumen de ingresos: ${error.message}`);
  }

  return data?.[0] || { expected_total: 0, received_total: 0, pending_total: 0 };
}

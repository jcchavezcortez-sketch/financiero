import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

export function getAvailableLiquidity(accounts: AccountRow[]): number {
  return accounts
    .filter((a) => a.is_active && a.include_in_available_balance && a.account_type !== "credit_card")
    .reduce((s, a) => s + a.balance, 0);
}

export function getProtectedSavings(accounts: AccountRow[]): number {
  return accounts
    .filter((a) => a.is_active && !a.include_in_available_balance && a.include_in_net_worth)
    .reduce((s, a) => s + a.balance, 0);
}

export function getTotalLiabilities(liabilities: LiabilityRow[]): number {
  return liabilities
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + l.current_balance, 0);
}

export function getNetWorth(accounts: AccountRow[], liabilities: LiabilityRow[]): number {
  return getAvailableLiquidity(accounts) + getProtectedSavings(accounts) - getTotalLiabilities(liabilities);
}

export function getMonthlyIncome(transactions: TransactionRow[]): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthlyExpenses(transactions: TransactionRow[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthlyBalance(transactions: TransactionRow[]): number {
  return getMonthlyIncome(transactions) - getMonthlyExpenses(transactions);
}

export function getNextDueDate(liabilities: LiabilityRow[]): LiabilityRow | null {
  const active = liabilities
    .filter((l) => l.status === "active" && l.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  return active[0] ?? null;
}

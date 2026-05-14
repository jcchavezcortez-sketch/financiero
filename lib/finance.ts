import type { Account, Liability, FinancialOverview } from "@/types";

// Accounts whose type implies they should NOT count as liquid cash by default.
// The DB flag `include_in_available_balance` is the source of truth; this is
// a client-side safety net for accounts that predate the migration.
const NON_LIQUID_TYPES = new Set(["credit_card", "credit", "protected_savings"]);

export function getAvailableLiquidity(accounts: Account[]): number {
  return accounts
    .filter((a) => {
      if (typeof a.include_in_available_balance === "boolean") {
        return a.include_in_available_balance;
      }
      return !NON_LIQUID_TYPES.has(a.type);
    })
    .reduce((sum, a) => sum + a.balance, 0);
}

export function getProtectedSavings(accounts: Account[]): number {
  return accounts
    .filter((a) => {
      if (typeof a.include_in_available_balance === "boolean") {
        return !a.include_in_available_balance && a.include_in_net_worth !== false;
      }
      return a.type === "protected_savings";
    })
    .reduce((sum, a) => sum + a.balance, 0);
}

export function getTotalLiabilities(liabilities: Liability[]): number {
  return liabilities
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + l.current_balance, 0);
}

export function getNetWorth(accounts: Account[], liabilities: Liability[]): number {
  const assets = accounts
    .filter((a) => {
      if (typeof a.include_in_net_worth === "boolean") return a.include_in_net_worth;
      return !NON_LIQUID_TYPES.has(a.type) || a.type === "protected_savings";
    })
    .reduce((sum, a) => sum + a.balance, 0);
  return assets - getTotalLiabilities(liabilities);
}

export function getFinancialOverview(
  accounts: Account[],
  liabilities: Liability[]
): FinancialOverview {
  const liquidAvailable = getAvailableLiquidity(accounts);
  const protectedSavings = getProtectedSavings(accounts);
  const totalLiabilities = getTotalLiabilities(liabilities);
  const netWorth = getNetWorth(accounts, liabilities);
  return {
    liquidAvailable,
    protectedSavings,
    totalLiabilities,
    netWorth,
    availableToSpend: liquidAvailable,
  };
}

// ── Transaction-level helpers ─────────────────────────────────────────────────
// Uses movement_type as source of truth, falls back to type for legacy rows.

type TxRow = {
  type: string;
  movement_type?: string | null;
  amount: number;
  affects_monthly_income?: boolean | null;
  affects_monthly_expense?: boolean | null;
};

function movementType(t: TxRow): string {
  return t.movement_type ?? t.type;
}

/** Ingresos reales del mes (excluye transferencias, ajustes, etc.) */
export function getMonthlyIncome(transactions: TxRow[]): number {
  return transactions
    .filter((t) => t.affects_monthly_income ?? movementType(t) === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Gastos reales de consumo del mes (excluye pagos de deuda, transferencias, ajustes) */
export function getMonthlyExpenses(transactions: TxRow[]): number {
  return transactions
    .filter((t) => {
      if (t.affects_monthly_expense != null) return t.affects_monthly_expense;
      const mt = movementType(t);
      return mt === "expense" || mt === "credit_card_purchase";
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthlyBalance(transactions: TxRow[]): number {
  return getMonthlyIncome(transactions) - getMonthlyExpenses(transactions);
}

/** Pagos de deuda del mes (para mostrar como métrica separada en dashboard) */
export function getMonthlyDebtPayments(transactions: TxRow[]): number {
  return transactions
    .filter((t) => movementType(t) === "debt_payment")
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Solo gastos de consumo reales (expense + credit_card_purchase) */
export function getRealConsumptionExpenses(transactions: TxRow[]): number {
  return getMonthlyExpenses(transactions);
}

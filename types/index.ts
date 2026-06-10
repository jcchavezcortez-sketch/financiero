export type TransactionType = "expense" | "income";

export type MovementType =
  | "income"
  | "expense"
  | "transfer"
  | "debt_payment"
  | "credit_card_purchase"
  | "balance_adjustment"
  | "savings_allocation";

export type AccountType =
  | "debit"
  | "savings"
  | "protected_savings"
  | "cash"
  | "wallet"
  | "credit_card"
  | "other"
  // legacy values kept for backwards compat
  | "checking"
  | "digital"
  | "credit"
  | "investment";

export type LiabilityType = "credit_card" | "personal_debt" | "loan" | "other";
export type LiabilityStatus = "active" | "paid";

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  savingsGoal: number;
  payday: number;
  avatarUrl?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initial_balance: number;
  currency: string;
  color: string;
  icon: string;
  include_in_available_balance: boolean;
  include_in_net_worth: boolean;
  institution_name?: string | null;
  // credit card only
  credit_limit?: number | null;
  statement_closing_day?: number | null;
  payment_due_day?: number | null;
  card_network?: string | null;
  last_four_digits?: string | null;
}

export interface Liability {
  id: string;
  user_id?: string;
  liability_type: LiabilityType;
  name: string;
  creditor_name?: string | null;
  original_amount?: number | null;
  current_balance: number;
  due_date?: string | null;
  minimum_payment?: number | null;
  notes?: string | null;
  status: LiabilityStatus;
  linked_account_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export const CARD_NETWORKS = ["Visa", "Mastercard", "Amex", "Diners", "Otra"] as const;
export type CardNetwork = typeof CARD_NETWORKS[number];

export interface CreditCardWithLiability {
  account_id: string;
  name: string;
  institution_name: string | null;
  card_network: string | null;
  last_four_digits: string | null;
  credit_limit: number | null;
  statement_closing_day: number | null;
  payment_due_day: number | null;
  color: string;
  icon: string;
  liability_id: string | null;
  current_balance: number;
  original_amount: number | null;
  minimum_payment: number | null;
  status: string;
  notes: string | null;
}

export interface LiabilityPayment {
  id: string;
  user_id: string;
  liability_id: string;
  account_id: string;
  transaction_id: string | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  snapshot_date: string;
  liquid_available_amount: number;
  protected_savings_amount: number;
  total_liabilities_amount: number;
  net_worth_amount: number;
  notes?: string | null;
}

export interface FinancialOverview {
  liquidAvailable: number;
  protectedSavings: number;
  totalLiabilities: number;
  netWorth: number;
  availableToSpend: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | "both";
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  movement_type: MovementType;
  amount: number;
  description: string;
  merchant?: string;
  category: string;
  categoryId: string;
  accountId: string;
  accountName: string;
  fromAccountId?: string;
  toAccountId?: string;
  liabilityId?: string;
  date: string;
  notes?: string;
  currency: string;
  affects_monthly_income: boolean;
  affects_monthly_expense: boolean;
}

export interface MonthlySummary {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsGoal: number;
  savingsAchieved: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  transactionCount: number;
  percentage: number;
}

export interface Insight {
  id: string;
  type: "warning" | "success" | "info" | "alert";
  title: string;
  message: string;
  emoji: string;
  actionLabel?: string;
  actionUrl?: string;
}

export interface DailySpending {
  date: string;
  label: string;
  amount: number;
}

// ── Monthly commitments ───────────────────────────────────────────────────────

export type CommitmentType =
  | "rent"
  | "utility"
  | "subscription"
  | "insurance"
  | "debt_minimum"
  | "credit_card_minimum"
  | "loan_installment"
  | "savings_target"
  | "other";

export type CommitmentStatus = "pending" | "paid" | "skipped" | "overdue";

export interface MonthlyCommitment {
  id: string;
  user_id: string;
  name: string;
  commitment_type: CommitmentType;
  amount: number;
  currency: string;
  due_day: number | null;
  category_id: string | null;
  suggested_account_id: string | null;
  liability_id: string | null;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitmentMonthLog {
  id: string;
  user_id: string;
  commitment_id: string;
  period_month: string;
  status: "paid" | "skipped";
  paid_amount: number | null;
  paid_date: string | null;
  transaction_id: string | null;
  liability_payment_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CommitmentWithStatus extends MonthlyCommitment {
  log: CommitmentMonthLog | null;
  displayStatus: CommitmentStatus;
}

export interface MonthlyCommitmentSummary {
  total: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalSkipped: number;
  fixedExpensesPending: number;
  debtMinimumsPending: number;
  plannedSavingsPending: number;
  nextDue: CommitmentWithStatus | null;
}

export interface FreeCashFlowSummary {
  availableBalance: number;
  protectedSavings: number;
  totalDebt: number;
  creditCardDebt: number;
  fixedCommitmentsPending: number;
  debtMinimumsPending: number;
  plannedSavingsPending: number;
  totalCommitmentsPending: number;
  freeCashEstimated: number;
}

export const COMMITMENT_TYPE_META: Record<CommitmentType, { label: string; emoji: string; isDebt: boolean; isSavings: boolean }> = {
  rent:                { label: "Alquiler",            emoji: "🏠", isDebt: false, isSavings: false },
  utility:             { label: "Servicio básico",     emoji: "⚡", isDebt: false, isSavings: false },
  subscription:        { label: "Suscripción",         emoji: "📱", isDebt: false, isSavings: false },
  insurance:           { label: "Seguro",              emoji: "🛡️", isDebt: false, isSavings: false },
  debt_minimum:        { label: "Pago mínimo deuda",   emoji: "💳", isDebt: true,  isSavings: false },
  credit_card_minimum: { label: "Pago mínimo tarjeta", emoji: "💳", isDebt: true,  isSavings: false },
  loan_installment:    { label: "Cuota préstamo",      emoji: "🏦", isDebt: true,  isSavings: false },
  savings_target:      { label: "Ahorro planificado",  emoji: "🐷", isDebt: false, isSavings: true  },
  other:               { label: "Otro gasto fijo",     emoji: "📋", isDebt: false, isSavings: false },
};

export const DEBT_COMMITMENT_TYPES = new Set<CommitmentType>([
  "debt_minimum",
  "credit_card_minimum",
  "loan_installment",
]);

export const SAVINGS_COMMITMENT_TYPES = new Set<CommitmentType>([
  "savings_target",
]);

// ── Movement type metadata ────────────────────────────────────────────────────

export const MOVEMENT_META: Record<MovementType, { label: string; emoji: string; color: string }> = {
  income:               { label: "Ingreso",           emoji: "💰", color: "#10B981" },
  expense:              { label: "Gasto",              emoji: "💸", color: "#EF4444" },
  transfer:             { label: "Transferencia",      emoji: "↔️",  color: "#6366F1" },
  debt_payment:         { label: "Pago de deuda",      emoji: "💳", color: "#F59E0B" },
  credit_card_purchase: { label: "Compra con tarjeta", emoji: "🛍️", color: "#EC4899" },
  balance_adjustment:   { label: "Ajuste de saldo",   emoji: "⚖️",  color: "#64748B" },
  savings_allocation:   { label: "Ahorro protegido",  emoji: "🐷", color: "#14B8A6" },
};

export type TransactionType = "expense" | "income";

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
  created_at: string;
  updated_at?: string;
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
  amount: number;
  description: string;
  merchant?: string;
  category: string;
  categoryId: string;
  accountId: string;
  accountName: string;
  date: string;
  notes?: string;
  currency: string;
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

export type TransactionType = "expense" | "income";

export type AccountType =
  | "checking"
  | "savings"
  | "digital"
  | "cash"
  | "credit"
  | "investment";

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
  currency: string;
  color: string;
  icon: string;
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

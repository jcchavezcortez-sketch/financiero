export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          currency: string;
          payday: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          currency?: string;
          payday?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          currency?: string;
          payday?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          balance: number;
          initial_balance: number;
          currency: string;
          color: string;
          icon: string;
          is_active: boolean;
          include_in_available_balance: boolean;
          include_in_net_worth: boolean;
          institution_name: string | null;
          credit_limit: number | null;
          statement_closing_day: number | null;
          payment_due_day: number | null;
          card_network: string | null;
          last_four_digits: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          balance?: number;
          initial_balance?: number;
          currency?: string;
          color?: string;
          icon?: string;
          is_active?: boolean;
          include_in_available_balance?: boolean;
          include_in_net_worth?: boolean;
          institution_name?: string | null;
          credit_limit?: number | null;
          statement_closing_day?: number | null;
          payment_due_day?: number | null;
          card_network?: string | null;
          last_four_digits?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          balance?: number;
          initial_balance?: number;
          currency?: string;
          color?: string;
          icon?: string;
          is_active?: boolean;
          include_in_available_balance?: boolean;
          include_in_net_worth?: boolean;
          institution_name?: string | null;
          credit_limit?: number | null;
          statement_closing_day?: number | null;
          payment_due_day?: number | null;
          card_network?: string | null;
          last_four_digits?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      liabilities: {
        Row: {
          id: string;
          user_id: string;
          liability_type: string;
          name: string;
          creditor_name: string | null;
          original_amount: number | null;
          current_balance: number;
          due_date: string | null;
          minimum_payment: number | null;
          notes: string | null;
          status: string;
          linked_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          liability_type: string;
          name: string;
          creditor_name?: string | null;
          original_amount?: number | null;
          current_balance: number;
          due_date?: string | null;
          minimum_payment?: number | null;
          notes?: string | null;
          status?: string;
          linked_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          liability_type?: string;
          name?: string;
          creditor_name?: string | null;
          original_amount?: number | null;
          current_balance?: number;
          due_date?: string | null;
          minimum_payment?: number | null;
          notes?: string | null;
          status?: string;
          linked_account_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      financial_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          liquid_available_amount: number;
          protected_savings_amount: number;
          total_liabilities_amount: number;
          net_worth_amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          snapshot_date?: string;
          liquid_available_amount?: number;
          protected_savings_amount?: number;
          total_liabilities_amount?: number;
          net_worth_amount?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          liquid_available_amount?: number;
          protected_savings_amount?: number;
          total_liabilities_amount?: number;
          net_worth_amount?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          type: string;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          type: string;
          is_custom?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          movement_type: string;
          amount: number;
          description: string;
          merchant: string | null;
          category_id: string | null;
          account_id: string;
          from_account_id: string | null;
          to_account_id: string | null;
          liability_id: string | null;
          related_transaction_id: string | null;
          commitment_id: string | null;
          date: string;
          notes: string | null;
          currency: string;
          source: string;
          affects_monthly_income: boolean;
          affects_monthly_expense: boolean;
          affects_available_balance: boolean;
          affects_net_worth: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          movement_type?: string;
          amount: number;
          description: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id: string;
          from_account_id?: string | null;
          to_account_id?: string | null;
          liability_id?: string | null;
          related_transaction_id?: string | null;
          commitment_id?: string | null;
          date: string;
          notes?: string | null;
          currency?: string;
          source?: string;
          affects_monthly_income?: boolean;
          affects_monthly_expense?: boolean;
          affects_available_balance?: boolean;
          affects_net_worth?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: string;
          movement_type?: string;
          amount?: number;
          description?: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id?: string;
          from_account_id?: string | null;
          to_account_id?: string | null;
          liability_id?: string | null;
          commitment_id?: string | null;
          date?: string;
          notes?: string | null;
          affects_monthly_income?: boolean;
          affects_monthly_expense?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          monthly_income: number | null;
          savings_goal: number | null;
          delivery_limit: number | null;
          subscriptions_limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          monthly_income?: number | null;
          savings_goal?: number | null;
          delivery_limit?: number | null;
          subscriptions_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          monthly_income?: number | null;
          savings_goal?: number | null;
          delivery_limit?: number | null;
          subscriptions_limit?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          deadline?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          target_amount?: number;
          current_amount?: number;
          deadline?: string | null;
          is_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      statement_imports: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          status: string;
          total_rows: number;
          imported_rows: number;
          skipped_rows: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          status?: string;
          total_rows?: number;
          imported_rows?: number;
          skipped_rows?: number;
          created_at?: string;
        };
        Update: {
          status?: string;
          imported_rows?: number;
          skipped_rows?: number;
        };
        Relationships: [];
      };
      liability_payments: {
        Row: {
          id: string;
          user_id: string;
          liability_id: string;
          account_id: string;
          transaction_id: string | null;
          amount: number;
          payment_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          liability_id: string;
          account_id: string;
          transaction_id?: string | null;
          amount: number;
          payment_date: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          notes?: string | null;
        };
        Relationships: [];
      };
      monthly_commitments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          commitment_type: string;
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
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          commitment_type: string;
          amount: number;
          currency?: string;
          due_day?: number | null;
          category_id?: string | null;
          suggested_account_id?: string | null;
          liability_id?: string | null;
          is_active?: boolean;
          starts_on?: string | null;
          ends_on?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          commitment_type?: string;
          amount?: number;
          currency?: string;
          due_day?: number | null;
          category_id?: string | null;
          suggested_account_id?: string | null;
          liability_id?: string | null;
          is_active?: boolean;
          starts_on?: string | null;
          ends_on?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      commitment_month_logs: {
        Row: {
          id: string;
          user_id: string;
          commitment_id: string;
          period_month: string;
          status: string;
          paid_amount: number | null;
          paid_date: string | null;
          transaction_id: string | null;
          liability_payment_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          commitment_id: string;
          period_month: string;
          status?: string;
          paid_amount?: number | null;
          paid_date?: string | null;
          transaction_id?: string | null;
          liability_payment_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          paid_amount?: number | null;
          paid_date?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      category_budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          monthly_limit: number;
          currency: string;
          alert_threshold: number;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          monthly_limit: number;
          currency?: string;
          alert_threshold?: number;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          monthly_limit?: number;
          currency?: string;
          alert_threshold?: number;
          is_active?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          currency: string;
          source_type: string;
          expected_day: number | null;
          expected_account_id: string | null;
          category_id: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          currency?: string;
          source_type: string;
          expected_day?: number | null;
          expected_account_id?: string | null;
          category_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          amount?: number;
          currency?: string;
          source_type?: string;
          expected_day?: number | null;
          expected_account_id?: string | null;
          category_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      monthly_income_logs: {
        Row: {
          id: string;
          user_id: string;
          income_source_id: string;
          period_month: string;
          status: string;
          received_amount: number | null;
          received_date: string | null;
          transaction_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          income_source_id: string;
          period_month: string;
          status?: string;
          received_amount?: number | null;
          received_date?: string | null;
          transaction_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          received_amount?: number | null;
          received_date?: string | null;
          transaction_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      import_rows: {
        Row: {
          id: string;
          import_id: string;
          user_id: string;
          raw_date: string | null;
          raw_description: string | null;
          raw_amount: string | null;
          parsed_amount: number | null;
          parsed_type: string | null;
          is_duplicate: boolean;
          was_imported: boolean;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          import_id: string;
          user_id: string;
          raw_date?: string | null;
          raw_description?: string | null;
          raw_amount?: string | null;
          parsed_amount?: number | null;
          parsed_type?: string | null;
          is_duplicate?: boolean;
          was_imported?: boolean;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          was_imported?: boolean;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      seed_default_categories: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      ensure_debt_category: {
        Args: { p_user_id: string };
        Returns: string;
      };
      delete_all_user_data: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      get_category_budget_spending: {
        Args: { p_category_id: string };
        Returns: {
          budget_id: string;
          monthly_limit: number;
          current_spending: number;
          percentage_used: number;
          is_over_budget: boolean;
        }[];
      };
      get_monthly_income_summary: {
        Args: Record<string, never>;
        Returns: {
          expected_total: number;
          received_total: number;
          pending_total: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

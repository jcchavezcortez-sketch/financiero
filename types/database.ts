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
          currency: string;
          color: string;
          icon: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: string;
          balance?: number;
          currency?: string;
          color?: string;
          icon?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          balance?: number;
          currency?: string;
          color?: string;
          icon?: string;
          is_active?: boolean;
          updated_at?: string;
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
          amount: number;
          description: string;
          merchant: string | null;
          category_id: string | null;
          account_id: string;
          date: string;
          notes: string | null;
          currency: string;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          amount: number;
          description: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id: string;
          date: string;
          notes?: string | null;
          currency?: string;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: string;
          amount?: number;
          description?: string;
          merchant?: string | null;
          category_id?: string | null;
          account_id?: string;
          date?: string;
          notes?: string | null;
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
      liabilities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          original_amount: number;
          current_balance: number;
          due_date: string | null;
          creditor: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          original_amount: number;
          current_balance: number;
          due_date?: string | null;
          creditor?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          original_amount?: number;
          current_balance?: number;
          due_date?: string | null;
          creditor?: string | null;
          notes?: string | null;
          status?: string;
          updated_at?: string;
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
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  starting_balance: number;
  is_archived: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  description: string;
  amount: number;
  is_projected: boolean;
  recurring_bill_id: string | null;
  created_at: string;
};

export type RecurringBill = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  name: string;
  is_variable: boolean;
  amount: number | null;
  estimated_amount: number | null;
  due_day_of_month: number;
  is_active: boolean;
  created_at: string;
};

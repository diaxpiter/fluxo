export type AccountType =
  | "checking"
  | "savings"
  | "sinking_fund"
  | "emergency"
  | "investment"
  | "shared"
  | "cash"
  | "other";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  starting_balance: number;
  is_archived: boolean;
  include_in_overview: boolean;
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
  income_source_id: string | null;
  transfer_group_id: string | null;
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

export type IncomeScheduleType = "fixed_monthly_date" | "irregular";
export type WeekendHolidayRule = "shift_earlier" | "shift_later" | "none";

export type IncomeSource = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  name: string;
  schedule_type: IncomeScheduleType;
  day_of_month: number | null;
  weekend_holiday_rule: WeekendHolidayRule;
  expected_amount: number | null;
  is_active: boolean;
  created_at: string;
};

export type AllocationMethod = "fixed_amount" | "percentage" | "remainder";

export type AllocationRule = {
  id: string;
  user_id: string;
  target_account_id: string;
  priority_order: number;
  method: AllocationMethod;
  value: number | null;
  is_active: boolean;
  created_at: string;
};

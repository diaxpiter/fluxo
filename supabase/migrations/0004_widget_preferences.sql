-- Per-user dashboard widget preferences: which stat tiles are shown and
-- under what title. Existing rows get backfilled with this same default.
alter table public.profiles
add column widgets jsonb not null default '[
  {"key":"end_of_month_projection","title":"Predicted balance until end of month","visible":true},
  {"key":"bills_to_pay","title":"Bills to be paid this month","visible":true},
  {"key":"incoming_this_week","title":"Money to come this week","visible":true},
  {"key":"paid_this_week","title":"Amount paid this week","visible":true},
  {"key":"spent_this_month","title":"Spent this month","visible":true},
  {"key":"biggest_expense_this_month","title":"Biggest expense this month","visible":true}
]'::jsonb;

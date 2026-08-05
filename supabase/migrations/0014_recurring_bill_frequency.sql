-- Recurring bills gain real frequency: monthly (existing behaviour, unchanged), weekly,
-- bi-weekly, and yearly. anchor_date is only meaningful for bi-weekly (it's the reference date
-- used to work out which weeks are "on" in the 14-day cycle) -- weekly doesn't need one, any day
-- matching due_day_of_week recurs every week.
alter table public.recurring_bills
add column recurrence_type text not null default 'monthly' check (
  recurrence_type in ('monthly', 'weekly', 'biweekly', 'yearly')
),
add column due_day_of_week int check (due_day_of_week between 0 and 6),
add column due_month int check (due_month between 1 and 12),
add column anchor_date date;

alter table public.recurring_bills
alter column due_day_of_month
drop not null;

alter table public.recurring_bills
add constraint recurring_bills_recurrence_fields_check check (
  (
    recurrence_type = 'monthly'
    and due_day_of_month is not null
  )
  or (
    recurrence_type = 'weekly'
    and due_day_of_week is not null
  )
  or (
    recurrence_type = 'biweekly'
    and due_day_of_week is not null
    and anchor_date is not null
  )
  or (
    recurrence_type = 'yearly'
    and due_day_of_month is not null
    and due_month is not null
  )
);

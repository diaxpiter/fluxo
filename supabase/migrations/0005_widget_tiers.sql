-- Give each widget an explicit tier (row): tiles sharing a tier split that
-- row evenly, a tile alone in its tier stretches full width.
alter table public.profiles
alter column widgets
set default '[
  {"key":"end_of_month_projection","title":"Predicted balance until end of month","visible":true,"tier":1},
  {"key":"bills_to_pay","title":"Bills to be paid this month","visible":true,"tier":2},
  {"key":"incoming_this_week","title":"Money to come this week","visible":true,"tier":2},
  {"key":"paid_this_week","title":"Amount paid this week","visible":true,"tier":3},
  {"key":"spent_this_month","title":"Spent this month","visible":true,"tier":3},
  {"key":"biggest_expense_this_month","title":"Biggest expense this month","visible":true,"tier":4}
]'::jsonb;

-- Backfill existing rows with a tier per widget key, without touching any
-- title/visible/order customization already saved.
update public.profiles p
set
  widgets = (
    select jsonb_agg(
      elem || jsonb_build_object(
        'tier',
        case elem ->> 'key'
          when 'end_of_month_projection' then 1
          when 'bills_to_pay' then 2
          when 'incoming_this_week' then 2
          when 'paid_this_week' then 3
          when 'spent_this_month' then 3
          when 'biggest_expense_this_month' then 4
          else 99
        end
      )
      order by ord
    )
    from jsonb_array_elements(p.widgets) with ordinality as arr (elem, ord)
  )
where
  not (p.widgets -> 0 ? 'tier');

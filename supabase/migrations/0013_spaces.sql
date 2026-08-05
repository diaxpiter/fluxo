-- Spaces: the top-level container a user switches between (e.g. "Personal" vs "Ring & Co").
-- Every account/category/recurring bill/income source/allocation rule belongs to exactly one
-- space, so each space is a fully separate ledger. Widget layout preferences move here too (were
-- on profiles) since different spaces reasonably want a different Home layout.
create table public.spaces (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#10b981',
  widgets jsonb default '[
    {"key":"end_of_month_projection","title":"Predicted balance until end of month","visible":true,"tier":1},
    {"key":"bills_to_pay","title":"Bills to be paid this month","visible":true,"tier":2},
    {"key":"incoming_this_week","title":"Money to come this week","visible":true,"tier":2},
    {"key":"paid_this_week","title":"Amount paid this week","visible":true,"tier":3},
    {"key":"spent_this_month","title":"Spent this month","visible":true,"tier":3},
    {"key":"biggest_expense_this_month","title":"Biggest expense this month","visible":true,"tier":4}
  ]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.spaces enable row level security;

create policy "Users manage own spaces" on public.spaces for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- Backfill: every existing user gets one "Personal" space, carrying over their current widget prefs.
insert into public.spaces (user_id, name, widgets)
select id, 'Personal', widgets
from public.profiles;

alter table public.accounts add column space_id uuid references public.spaces (id) on delete cascade;
alter table public.categories add column space_id uuid references public.spaces (id) on delete cascade;
alter table public.recurring_bills add column space_id uuid references public.spaces (id) on delete cascade;
alter table public.income_sources add column space_id uuid references public.spaces (id) on delete cascade;
alter table public.allocation_rules add column space_id uuid references public.spaces (id) on delete cascade;

update public.accounts a set space_id = s.id from public.spaces s where s.user_id = a.user_id;
update public.categories c set space_id = s.id from public.spaces s where s.user_id = c.user_id;
update public.recurring_bills b set space_id = s.id from public.spaces s where s.user_id = b.user_id;
update public.income_sources i set space_id = s.id from public.spaces s where s.user_id = i.user_id;
update public.allocation_rules r set space_id = s.id from public.spaces s where s.user_id = r.user_id;

alter table public.accounts alter column space_id set not null;
alter table public.categories alter column space_id set not null;
alter table public.recurring_bills alter column space_id set not null;
alter table public.income_sources alter column space_id set not null;
alter table public.allocation_rules alter column space_id set not null;

-- Every new signup now also gets a default "Personal" space, and the seeded Main Account +
-- starter categories belong to it (rather than floating unscoped).
create or replace function public.handle_new_user_ledger () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
  new_space_id uuid;
begin
  insert into public.spaces (user_id, name)
  values (new.id, 'Personal')
  returning id into new_space_id;

  insert into public.accounts (user_id, space_id, name, type)
  values (new.id, new_space_id, 'Main Account', 'checking');

  insert into public.categories (user_id, space_id, name, kind)
  values
    (new.id, new_space_id, 'Income', 'income'),
    (new.id, new_space_id, 'Housing', 'fixed_bill'),
    (new.id, new_space_id, 'Utilities', 'fixed_bill'),
    (new.id, new_space_id, 'Subscriptions', 'fixed_bill'),
    (new.id, new_space_id, 'Savings', 'savings'),
    (new.id, new_space_id, 'Discretionary', 'discretionary'),
    (new.id, new_space_id, 'Other', 'other');

  return new;
end;
$$;

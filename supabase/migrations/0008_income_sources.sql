-- Income sources: the income-side counterpart to recurring_bills. Also
-- declarative, also merged into widgets by date rather than auto-generating
-- transactions. weekend_holiday_rule is named for the full roadmap concept
-- but only the weekend half is implemented in application code for now —
-- holiday-awareness needs a real calendar and can be added later without a
-- schema change.
create table public.income_sources (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  schedule_type text not null default 'fixed_monthly_date' check (schedule_type in ('fixed_monthly_date', 'irregular')),
  day_of_month int check (day_of_month between 1 and 31),
  weekend_holiday_rule text not null default 'none' check (weekend_holiday_rule in ('shift_earlier', 'shift_later', 'none')),
  expected_amount numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (schedule_type = 'fixed_monthly_date' and day_of_month is not null)
    or (schedule_type = 'irregular' and day_of_month is null)
  )
);

alter table public.income_sources enable row level security;

create policy "Users manage own income sources" on public.income_sources for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- Links a real transaction back to the income source it recorded, so
-- widgets don't double-count a source already received this month.
alter table public.transactions
add column income_source_id uuid references public.income_sources (id) on delete set null;

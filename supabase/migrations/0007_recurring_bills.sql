-- Recurring bills: declarative monthly obligations, not auto-materialized
-- into transactions. Widgets merge them with real transactions; paying one
-- creates an ordinary transaction linked back via recurring_bill_id.
create table public.recurring_bills (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  is_variable boolean not null default false,
  amount numeric(12, 2),
  estimated_amount numeric(12, 2),
  due_day_of_month int not null check (due_day_of_month between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (is_variable and estimated_amount is not null)
    or (not is_variable and amount is not null)
  )
);

alter table public.recurring_bills enable row level security;

create policy "Users manage own recurring bills" on public.recurring_bills for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- Links a real transaction back to the recurring bill it paid, so widgets
-- don't double-count a bill that's already been paid this month.
alter table public.transactions
add column recurring_bill_id uuid references public.recurring_bills (id) on delete set null;

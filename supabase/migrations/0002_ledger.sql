-- Accounts: a user's "money containers" (checking, savings, etc).
create table public.accounts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null default 'checking' check (
    type in (
      'checking',
      'savings',
      'sinking_fund',
      'emergency',
      'investment',
      'shared',
      'cash',
      'other'
    )
  ),
  starting_balance numeric(12, 2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Users manage own accounts" on public.accounts for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- Categories: free-form tags, not a rigid budget structure.
create table public.categories (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'other' check (
    kind in (
      'income',
      'fixed_bill',
      'savings',
      'investment',
      'shared',
      'discretionary',
      'other'
    )
  ),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users manage own categories" on public.categories for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- Transactions: the ledger itself. amount is signed (positive = in, negative = out).
create table public.transactions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  date date not null default current_date,
  description text not null,
  amount numeric(12, 2) not null,
  is_projected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users manage own transactions" on public.transactions for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

create index transactions_account_date_idx on public.transactions (account_id, date, created_at);

-- Seed a default account + starter categories for every new signup.
create function public.handle_new_user_ledger () returns trigger language plpgsql security definer
set
  search_path = public as $$
begin
  insert into public.accounts (user_id, name, type)
  values (new.id, 'Main Account', 'checking');

  insert into public.categories (user_id, name, kind)
  values
    (new.id, 'Income', 'income'),
    (new.id, 'Housing', 'fixed_bill'),
    (new.id, 'Utilities', 'fixed_bill'),
    (new.id, 'Subscriptions', 'fixed_bill'),
    (new.id, 'Savings', 'savings'),
    (new.id, 'Discretionary', 'discretionary'),
    (new.id, 'Other', 'other');

  return new;
end;
$$;

create trigger on_auth_user_created_ledger
after insert on auth.users for each row
execute function public.handle_new_user_ledger ();

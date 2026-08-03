-- Ordered rules applied to income when it lands: split it across accounts by
-- priority. Each active rule becomes one transfer leg out of the account the
-- income landed in, computed and applied in src/lib/allocation.ts.
create table public.allocation_rules (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_account_id uuid not null references public.accounts (id) on delete cascade,
  priority_order int not null default 0,
  method text not null check (method in ('fixed_amount', 'percentage', 'remainder')),
  value numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (method = 'remainder' and value is null)
    or (
      method in ('fixed_amount', 'percentage')
      and value is not null
    )
  )
);

alter table public.allocation_rules enable row level security;

create policy "Users manage own allocation rules" on public.allocation_rules for all using (
  auth.uid () = user_id
  and target_account_id in (
    select id
    from public.accounts
    where
      user_id = auth.uid ()
  )
)
with
  check (
    auth.uid () = user_id
    and target_account_id in (
      select id
      from public.accounts
      where
        user_id = auth.uid ()
    )
  );

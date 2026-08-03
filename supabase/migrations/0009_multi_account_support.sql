-- Every account a user opts into counting toward the aggregated Home
-- overview (widgets, predicted balance). Investment/emergency-fund accounts
-- can be excluded without hiding them entirely.
alter table public.accounts
add column include_in_overview boolean not null default true;

-- Groups the two legs of a transfer between the user's own accounts. Not a
-- foreign key to anything -- just a shared value linking exactly two rows.
alter table public.transactions
add column transfer_group_id uuid;

create index transactions_transfer_group_idx on public.transactions (transfer_group_id)
where
  transfer_group_id is not null;

-- Existing RLS only checked user_id, not that account_id actually belongs to
-- that user -- a pre-existing gap that matters more now that account_id
-- shows up in more places (transfers, account pickers). Tighten it while
-- touching this table.
drop policy "Users manage own transactions" on public.transactions;

create policy "Users manage own transactions" on public.transactions for all using (
  auth.uid () = user_id
  and account_id in (
    select id
    from public.accounts
    where
      user_id = auth.uid ()
  )
)
with
  check (
    auth.uid () = user_id
    and account_id in (
      select id
      from public.accounts
      where
        user_id = auth.uid ()
    )
  );

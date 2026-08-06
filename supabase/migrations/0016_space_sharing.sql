-- Real shared spaces. Until now a space's name ("Ring & Co") implied two people looking at
-- the same ledger, but structurally every space had exactly one owner and no invite/member
-- model. This adds one: space_members is a join table between a space and a second user,
-- created as a pending row (matched by email, since we can't look up auth.users directly from
-- the client) and flipped to accepted once that person logs in and accepts it.
--
-- Access model chosen: equal collaborators. Once accepted, a member can view and edit
-- everything in the space -- accounts, transactions, bills, income sources, allocation rules --
-- the same as the owner. Only the owner can rename/delete the space itself or manage members.
-- user_id on the ledger tables now means "added/last touched by", not "has access to" --
-- access is governed by space membership, checked via is_space_member() below.
create table public.space_members (
  id uuid primary key default gen_random_uuid (),
  space_id uuid not null references public.spaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (space_id, invited_email)
);

alter table public.space_members enable row level security;

-- security definer + fixed search_path: these two helpers are called from inside other tables'
-- RLS policies, so they must not themselves be subject to (and recurse into) the RLS of the
-- tables they read. Each only ever returns a boolean about the space/user the caller supplied,
-- so it can't be used to exfiltrate rows the caller couldn't otherwise see.
create or replace function public.is_space_member (check_space_id uuid) returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (
    select 1 from public.spaces where id = check_space_id and user_id = auth.uid ()
  ) or exists (
    select 1 from public.space_members
    where space_id = check_space_id and user_id = auth.uid () and status = 'accepted'
  );
$$;

create or replace function public.shares_space_with (other_user uuid) returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (
    select 1
    from public.spaces s
    where (s.user_id = auth.uid () or exists (
      select 1 from public.space_members m where m.space_id = s.id and m.user_id = auth.uid () and m.status = 'accepted'
    ))
    and (s.user_id = other_user or exists (
      select 1 from public.space_members m where m.space_id = s.id and m.user_id = other_user and m.status = 'accepted'
    ))
  );
$$;

-- Space members: an owner sees everyone invited into their own spaces; an invitee sees invites
-- addressed to their own email (whether still pending or already accepted).
create policy "View members of own spaces or own invites" on public.space_members for select using (
  space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
  or invited_email = auth.email ()
);

create policy "Owner creates invites" on public.space_members for insert
with
  check (
    invited_by = auth.uid ()
    and status = 'pending'
    and user_id is null
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
  );

-- Either the owner adjusts a membership row in their own space, or the invitee accepts their
-- own still-pending invite (and only their own -- they can't flip someone else's, and can't set
-- user_id to anything but their own id).
create policy "Owner manages members or invitee accepts" on public.space_members for update using (
  space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
  or invited_email = auth.email ()
)
with
  check (
    space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
    or (
      invited_email = auth.email ()
      and user_id = auth.uid ()
      and status = 'accepted'
    )
  );

-- The owner can revoke/remove anyone; an accepted member can remove themself (leave the space).
create policy "Owner or member removes membership" on public.space_members for delete using (
  space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
  or user_id = auth.uid ()
);

-- Spaces: visible to the owner, to accepted members, and to a pending invitee (so they can see
-- what they're being asked to join before accepting). Only the owner can rename/re-color/delete
-- it or manage its widget layout is now shared editing (see accepted-member update clause) --
-- deleting the whole space stays owner-only since it's destructive to a jointly-used ledger.
drop policy "Users manage own spaces" on public.spaces;

create policy "Owner or member views space" on public.spaces for select using (
  auth.uid () = user_id
  or public.is_space_member (id)
  or exists (
    select 1
    from public.space_members m
    where
      m.space_id = spaces.id
      and m.invited_email = auth.email ()
  )
);

create policy "Owner creates space" on public.spaces for insert
with
  check (auth.uid () = user_id);

create policy "Owner or member updates space" on public.spaces
for update
  using (public.is_space_member (id))
with
  check (public.is_space_member (id));

create policy "Owner deletes space" on public.spaces for delete using (auth.uid () = user_id);

-- Profiles: a space-mate's display name/currency needs to be visible for the members list and
-- for showing who added what -- extend the existing "view own profile" rule rather than
-- replace its intent.
drop policy "Users can view own profile" on public.profiles;

create policy "View own or shared-space profile" on public.profiles for select using (
  auth.uid () = id
  or public.shares_space_with (id)
);

-- Ledger tables: replace the user_id-ownership policies (0002/0007/0008/0009/0010, hardened by
-- 0015) with space-membership ones. user_id stays on every insert/update as "who actually did
-- this", enforced via with check, but no longer gates read/delete access -- the space does.
drop policy "Users manage own accounts" on public.accounts;

create policy "Space members select accounts" on public.accounts for select using (public.is_space_member (space_id));

create policy "Space members insert accounts" on public.accounts for insert
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
  );

create policy "Space members update accounts" on public.accounts
for update
  using (public.is_space_member (space_id))
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
  );

create policy "Space members delete accounts" on public.accounts for delete using (public.is_space_member (space_id));

drop policy "Users manage own categories" on public.categories;

create policy "Space members select categories" on public.categories for select using (public.is_space_member (space_id));

create policy "Space members insert categories" on public.categories for insert
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
  );

create policy "Space members update categories" on public.categories
for update
  using (public.is_space_member (space_id))
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
  );

create policy "Space members delete categories" on public.categories for delete using (public.is_space_member (space_id));

drop policy "Users manage own recurring bills" on public.recurring_bills;

create policy "Space members select recurring bills" on public.recurring_bills for select using (public.is_space_member (space_id));

create policy "Space members insert recurring bills" on public.recurring_bills for insert
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = recurring_bills.account_id
        and a.space_id = recurring_bills.space_id
    )
    and (
      recurring_bills.category_id is null
      or exists (
        select 1
        from public.categories c
        where
          c.id = recurring_bills.category_id
          and c.space_id = recurring_bills.space_id
      )
    )
  );

create policy "Space members update recurring bills" on public.recurring_bills
for update
  using (public.is_space_member (space_id))
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = recurring_bills.account_id
        and a.space_id = recurring_bills.space_id
    )
    and (
      recurring_bills.category_id is null
      or exists (
        select 1
        from public.categories c
        where
          c.id = recurring_bills.category_id
          and c.space_id = recurring_bills.space_id
      )
    )
  );

create policy "Space members delete recurring bills" on public.recurring_bills for delete using (public.is_space_member (space_id));

drop policy "Users manage own income sources" on public.income_sources;

create policy "Space members select income sources" on public.income_sources for select using (public.is_space_member (space_id));

create policy "Space members insert income sources" on public.income_sources for insert
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = income_sources.account_id
        and a.space_id = income_sources.space_id
    )
    and (
      income_sources.category_id is null
      or exists (
        select 1
        from public.categories c
        where
          c.id = income_sources.category_id
          and c.space_id = income_sources.space_id
      )
    )
  );

create policy "Space members update income sources" on public.income_sources
for update
  using (public.is_space_member (space_id))
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = income_sources.account_id
        and a.space_id = income_sources.space_id
    )
    and (
      income_sources.category_id is null
      or exists (
        select 1
        from public.categories c
        where
          c.id = income_sources.category_id
          and c.space_id = income_sources.space_id
      )
    )
  );

create policy "Space members delete income sources" on public.income_sources for delete using (public.is_space_member (space_id));

drop policy "Users manage own allocation rules" on public.allocation_rules;

create policy "Space members select allocation rules" on public.allocation_rules for select using (public.is_space_member (space_id));

create policy "Space members insert allocation rules" on public.allocation_rules for insert
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = allocation_rules.target_account_id
        and a.space_id = allocation_rules.space_id
    )
  );

create policy "Space members update allocation rules" on public.allocation_rules
for update
  using (public.is_space_member (space_id))
with
  check (
    user_id = auth.uid ()
    and public.is_space_member (space_id)
    and exists (
      select 1
      from public.accounts a
      where
        a.id = allocation_rules.target_account_id
        and a.space_id = allocation_rules.space_id
    )
  );

create policy "Space members delete allocation rules" on public.allocation_rules for delete using (public.is_space_member (space_id));

-- transactions has no space_id of its own -- it's scoped through account_id, same as before.
drop policy "Users manage own transactions" on public.transactions;

create policy "Space members select transactions" on public.transactions for select using (
  exists (
    select 1
    from public.accounts a
    where
      a.id = transactions.account_id
      and public.is_space_member (a.space_id)
  )
);

create policy "Space members insert transactions" on public.transactions for insert
with
  check (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.accounts a
      where
        a.id = transactions.account_id
        and public.is_space_member (a.space_id)
        and (
          transactions.category_id is null
          or exists (
            select 1
            from public.categories c
            where
              c.id = transactions.category_id
              and c.space_id = a.space_id
          )
        )
        and (
          transactions.recurring_bill_id is null
          or exists (
            select 1
            from public.recurring_bills b
            where
              b.id = transactions.recurring_bill_id
              and b.space_id = a.space_id
          )
        )
        and (
          transactions.income_source_id is null
          or exists (
            select 1
            from public.income_sources i
            where
              i.id = transactions.income_source_id
              and i.space_id = a.space_id
          )
        )
    )
  );

create policy "Space members update transactions" on public.transactions
for update
  using (
    exists (
      select 1
      from public.accounts a
      where
        a.id = transactions.account_id
        and public.is_space_member (a.space_id)
    )
  )
with
  check (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.accounts a
      where
        a.id = transactions.account_id
        and public.is_space_member (a.space_id)
        and (
          transactions.category_id is null
          or exists (
            select 1
            from public.categories c
            where
              c.id = transactions.category_id
              and c.space_id = a.space_id
          )
        )
    )
  );

create policy "Space members delete transactions" on public.transactions for delete using (
  exists (
    select 1
    from public.accounts a
    where
      a.id = transactions.account_id
      and public.is_space_member (a.space_id)
  )
);

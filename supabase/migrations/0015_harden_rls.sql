-- 0009 tightened transactions' RLS to check account_id actually belongs to the caller, and
-- called out that this was "a pre-existing gap" -- the same gap exists on every other table
-- that gained a space_id or a second FK since: none of them re-verify that the referenced
-- account/category/space is actually the caller's own. This closes that class of gap
-- everywhere it still exists, without changing the ownership model itself (still user_id-based
-- -- 0016 replaces this with space-membership-based access).
drop policy "Users manage own accounts" on public.accounts;

create policy "Users manage own accounts" on public.accounts for all using (
  auth.uid () = user_id
  and space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
)
with
  check (
    auth.uid () = user_id
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
  );

drop policy "Users manage own categories" on public.categories;

create policy "Users manage own categories" on public.categories for all using (
  auth.uid () = user_id
  and space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
)
with
  check (
    auth.uid () = user_id
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
  );

drop policy "Users manage own recurring bills" on public.recurring_bills;

create policy "Users manage own recurring bills" on public.recurring_bills for all using (
  auth.uid () = user_id
  and space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
  and account_id in (
    select id
    from public.accounts
    where
      user_id = auth.uid ()
  )
  and (
    category_id is null
    or category_id in (
      select id
      from public.categories
      where
        user_id = auth.uid ()
    )
  )
)
with
  check (
    auth.uid () = user_id
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
    and account_id in (
      select id
      from public.accounts
      where
        user_id = auth.uid ()
    )
    and (
      category_id is null
      or category_id in (
        select id
        from public.categories
        where
          user_id = auth.uid ()
      )
    )
  );

drop policy "Users manage own income sources" on public.income_sources;

create policy "Users manage own income sources" on public.income_sources for all using (
  auth.uid () = user_id
  and space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
  and account_id in (
    select id
    from public.accounts
    where
      user_id = auth.uid ()
  )
  and (
    category_id is null
    or category_id in (
      select id
      from public.categories
      where
        user_id = auth.uid ()
    )
  )
)
with
  check (
    auth.uid () = user_id
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
    and account_id in (
      select id
      from public.accounts
      where
        user_id = auth.uid ()
    )
    and (
      category_id is null
      or category_id in (
        select id
        from public.categories
        where
          user_id = auth.uid ()
      )
    )
  );

drop policy "Users manage own allocation rules" on public.allocation_rules;

create policy "Users manage own allocation rules" on public.allocation_rules for all using (
  auth.uid () = user_id
  and space_id in (
    select id
    from public.spaces
    where
      user_id = auth.uid ()
  )
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
    and space_id in (
      select id
      from public.spaces
      where
        user_id = auth.uid ()
    )
    and target_account_id in (
      select id
      from public.accounts
      where
        user_id = auth.uid ()
    )
  );

-- transactions already checked account_id (0009); category_id/recurring_bill_id/income_source_id
-- were the same kind of unchecked FK the app layer was working around with the ownedId() helper
-- in actions.ts -- enforce it in the database too, so RLS holds even if that helper is ever
-- bypassed or a call site forgets to use it.
drop policy "Users manage own transactions" on public.transactions;

create policy "Users manage own transactions" on public.transactions for all using (
  auth.uid () = user_id
  and account_id in (
    select id
    from public.accounts
    where
      user_id = auth.uid ()
  )
  and (
    category_id is null
    or category_id in (
      select id
      from public.categories
      where
        user_id = auth.uid ()
    )
  )
  and (
    recurring_bill_id is null
    or recurring_bill_id in (
      select id
      from public.recurring_bills
      where
        user_id = auth.uid ()
    )
  )
  and (
    income_source_id is null
    or income_source_id in (
      select id
      from public.income_sources
      where
        user_id = auth.uid ()
    )
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
    and (
      category_id is null
      or category_id in (
        select id
        from public.categories
        where
          user_id = auth.uid ()
      )
    )
    and (
      recurring_bill_id is null
      or recurring_bill_id in (
        select id
        from public.recurring_bills
        where
          user_id = auth.uid ()
      )
    )
    and (
      income_source_id is null
      or income_source_id in (
        select id
        from public.income_sources
        where
          user_id = auth.uid ()
      )
    )
  );

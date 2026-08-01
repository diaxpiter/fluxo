-- One-time backfill: the seed trigger in 0002_ledger.sql only fires for new
-- signups. Run this once so accounts created before that migration also get
-- a Main Account + starter categories.
insert into
  public.accounts (user_id, name, type)
select id, 'Main Account', 'checking'
from auth.users u
where
  not exists (
    select 1
    from public.accounts a
    where
      a.user_id = u.id
  );

insert into
  public.categories (user_id, name, kind)
select u.id, c.name, c.kind
from
  auth.users u
  cross join (
    values ('Income', 'income'),
      ('Housing', 'fixed_bill'),
      ('Utilities', 'fixed_bill'),
      ('Subscriptions', 'fixed_bill'),
      ('Savings', 'savings'),
      ('Discretionary', 'discretionary'),
      ('Other', 'other')
  ) as c (name, kind)
where
  not exists (
    select 1
    from public.categories cat
    where
      cat.user_id = u.id
  );

-- 0016 introduced a real infinite-recursion bug: `spaces`' select policy directly queried
-- `space_members` (to check for a pending invite), and `space_members`'s own select policy
-- directly queried `spaces` back (to check ownership) -- each table's RLS policy triggers the
-- other's, forever. is_space_member() avoided this correctly (security definer + owned by the
-- same role that owns both tables means its internal queries bypass RLS entirely, since table
-- owners bypass their own tables' RLS by default), but two direct cross-table subqueries were
-- left un-wrapped. Fix: route those two checks through security-definer helpers too, so no
-- policy on either table ever queries the other table directly.
create or replace function public.is_space_owner (check_space_id uuid) returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (
    select 1 from public.spaces where id = check_space_id and user_id = auth.uid ()
  );
$$;

create or replace function public.has_pending_invite (check_space_id uuid) returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (
    select 1 from public.space_members where space_id = check_space_id and invited_email = auth.email ()
  );
$$;

drop policy "Owner or member views space" on public.spaces;

create policy "Owner or member views space" on public.spaces for select using (
  auth.uid () = user_id
  or public.is_space_member (id)
  or public.has_pending_invite (id)
);

drop policy "View members of own spaces or own invites" on public.space_members;

create policy "View members of own spaces or own invites" on public.space_members for select using (
  public.is_space_owner (space_id)
  or invited_email = auth.email ()
);

drop policy "Owner creates invites" on public.space_members;

create policy "Owner creates invites" on public.space_members for insert
with
  check (
    invited_by = auth.uid ()
    and status = 'pending'
    and user_id is null
    and public.is_space_owner (space_id)
  );

drop policy "Owner manages members or invitee accepts" on public.space_members;

create policy "Owner manages members or invitee accepts" on public.space_members for update using (
  public.is_space_owner (space_id)
  or invited_email = auth.email ()
)
with
  check (
    public.is_space_owner (space_id)
    or (
      invited_email = auth.email ()
      and user_id = auth.uid ()
      and status = 'accepted'
    )
  );

drop policy "Owner or member removes membership" on public.space_members;

create policy "Owner or member removes membership" on public.space_members for delete using (
  public.is_space_owner (space_id)
  or user_id = auth.uid ()
);

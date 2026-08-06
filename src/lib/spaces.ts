import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingInvite, Space, SpaceMember, SpaceWithRole } from "@/lib/types";

export const SPACE_COOKIE = "current_space_id";

/**
 * Spaces the user can switch into: their own, plus any they've accepted an invite to.
 * Queried as two separate lookups (rather than relying on RLS's broader "select" policy, which
 * also surfaces spaces the user has only a *pending* invite to) so a not-yet-accepted invite
 * never shows up as a switchable space.
 */
export async function getSpaces(supabase: SupabaseClient, userId: string): Promise<SpaceWithRole[]> {
  const [{ data: owned }, { data: memberRows }] = await Promise.all([
    supabase.from("spaces").select("*").eq("user_id", userId),
    supabase
      .from("space_members")
      .select("space:spaces(*)")
      .eq("user_id", userId)
      .eq("status", "accepted"),
  ]);

  const ownedSpaces = ((owned as Space[] | null) ?? []).map((s) => ({ ...s, isOwner: true }));
  const memberSpaces = ((memberRows as unknown as { space: Space | null }[] | null) ?? [])
    .map((r) => r.space)
    .filter((s): s is Space => s !== null)
    .map((s) => ({ ...s, isOwner: false }));

  return [...ownedSpaces, ...memberSpaces].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/**
 * Resolves which space is "current" for this request: the cookie's value if it names one of
 * this user's accessible spaces, otherwise their oldest one. Every user always has at least one
 * -- seeded by the signup trigger -- so `spaces` is never expected to be empty here.
 */
export async function getCurrentSpace(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ spaces: SpaceWithRole[]; currentSpace: SpaceWithRole }> {
  const spaces = await getSpaces(supabase, userId);
  const cookieStore = await cookies();
  const requestedId = cookieStore.get(SPACE_COOKIE)?.value;
  const currentSpace = spaces.find((s) => s.id === requestedId) ?? spaces[0]!;

  return { spaces, currentSpace };
}

/**
 * Invites addressed to this user's own email that they haven't responded to yet. Matched by
 * email (not user_id) since the invite is created before the invitee necessarily has -- or is
 * known to have -- an account.
 */
export async function getPendingInvites(supabase: SupabaseClient, email: string): Promise<PendingInvite[]> {
  const { data: invites } = await supabase
    .from("space_members")
    .select("*, space:spaces(id, name, color)")
    .eq("invited_email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = (invites as (PendingInvite & { space: PendingInvite["space"] | null })[] | null) ?? [];
  const validRows = rows.filter((r) => r.space !== null);
  if (validRows.length === 0) return [];

  const inviterIds = [...new Set(validRows.map((r) => r.invited_by))];
  const { data: inviters } = await supabase.from("profiles").select("id, display_name").in("id", inviterIds);
  const inviterNames = new Map(((inviters as { id: string; display_name: string | null }[] | null) ?? []).map((p) => [p.id, p.display_name]));

  return validRows.map((r) => ({ ...r, inviterDisplayName: inviterNames.get(r.invited_by) ?? null }));
}

/** Everyone invited into a space (pending or accepted), for the Settings members list. */
export async function getSpaceMembers(
  supabase: SupabaseClient,
  spaceId: string,
): Promise<(SpaceMember & { displayName: string | null })[]> {
  const { data: members } = await supabase
    .from("space_members")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });

  const rows = (members as SpaceMember[] | null) ?? [];
  const memberUserIds = rows.map((m) => m.user_id).filter((id): id is string => id !== null);
  if (memberUserIds.length === 0) return rows.map((m) => ({ ...m, displayName: null }));

  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", memberUserIds);
  const names = new Map(
    ((profiles as { id: string; display_name: string | null }[] | null) ?? []).map((p) => [p.id, p.display_name]),
  );

  return rows.map((m) => ({ ...m, displayName: m.user_id ? names.get(m.user_id) ?? null : null }));
}

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Space } from "@/lib/types";

export const SPACE_COOKIE = "current_space_id";

export async function getSpaces(supabase: SupabaseClient, userId: string): Promise<Space[]> {
  const { data } = await supabase
    .from("spaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data as Space[] | null) ?? [];
}

/**
 * Resolves which space is "current" for this request: the cookie's value if it names one of
 * this user's own spaces, otherwise their oldest one. Every user always has at least one --
 * seeded by the signup trigger -- so `spaces` is never expected to be empty here.
 */
export async function getCurrentSpace(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ spaces: Space[]; currentSpace: Space }> {
  const spaces = await getSpaces(supabase, userId);
  const cookieStore = await cookies();
  const requestedId = cookieStore.get(SPACE_COOKIE)?.value;
  const currentSpace = spaces.find((s) => s.id === requestedId) ?? spaces[0]!;

  return { spaces, currentSpace };
}

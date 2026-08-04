import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cache } from "react";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  user_metadata: { display_name?: string };
};

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; safe to ignore because the
            // middleware below is what actually refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Deduped per-request: layouts and pages that both need the user share one lookup. The
 * proxy middleware already ran auth.getUser() (a real network round trip to Supabase) for
 * every request that reaches here, so we trust the identity it forwarded via headers
 * instead of paying for a second round trip on every navigation. Falls back to a direct
 * auth.getUser() call for anything the middleware matcher doesn't cover.
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const headerList = await headers();
  const trustedId = headerList.get("x-supabase-user-id");
  if (trustedId) {
    return {
      id: trustedId,
      email: headerList.get("x-supabase-user-email") || null,
      user_metadata: { display_name: headerList.get("x-supabase-user-display-name") || undefined },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: { display_name: user.user_metadata?.display_name as string | undefined },
  };
});

/**
 * Deduped per-request: layouts and pages that both need the profile (onboarding_completed,
 * currency, widgets) share one query instead of each running their own.
 */
export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("currency, widgets, onboarding_completed")
    .eq("id", userId)
    .single();
  return data;
});

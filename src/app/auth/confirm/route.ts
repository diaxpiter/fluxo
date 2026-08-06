import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, getLocale } from "@/lib/i18n/dictionary";

/**
 * Single callback for every Supabase email link -- signup confirmation, password recovery,
 * email change. Supabase's email templates must point here as
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=...`
 * (Authentication > Email Templates in the Supabase dashboard) for this to receive anything;
 * the default templates instead link to Supabase's own hosted verify endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const t = getDictionary(await getLocale()).auth.resetPassword;
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(t.expiredError)}`);
}

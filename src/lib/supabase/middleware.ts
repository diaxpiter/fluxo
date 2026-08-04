import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

// Headers carrying the identity this middleware already verified over the network, so
// downstream Server Components (getAuthenticatedUser) can trust it instead of paying for
// a second auth.getUser() round trip on every navigation. Stripped from the inbound
// request first so a client can't forge them.
const USER_ID_HEADER = "x-supabase-user-id";
const USER_EMAIL_HEADER = "x-supabase-user-email";
const USER_DISPLAY_NAME_HEADER = "x-supabase-user-display-name";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);
  requestHeaders.delete(USER_EMAIL_HEADER);
  requestHeaders.delete(USER_DISPLAY_NAME_HEADER);

  let cookiesToForward: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToForward = cookiesToSet;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    requestHeaders.set(USER_EMAIL_HEADER, user.email ?? "");
    requestHeaders.set(USER_DISPLAY_NAME_HEADER, (user.user_metadata?.display_name as string) ?? "");
  }

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Carry any refreshed auth cookies back to the browser, with their original options.
  cookiesToForward.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

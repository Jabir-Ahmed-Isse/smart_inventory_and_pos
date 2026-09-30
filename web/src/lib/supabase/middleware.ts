import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { USER_ID_HEADER } from "./constants";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Public routes reachable without an authenticated session. `/api/cron` is
 * exempt because those endpoints are protected by their own secret token
 * (REPORTS_CRON_SECRET) and are hit by an external scheduler, not a browser.
 */
const PUBLIC_PREFIXES = ["/login", "/register", "/auth", "/api/cron"];

/**
 * Refreshes the Supabase auth session on every request and gates the app:
 * unauthenticated users are redirected to /login (except on public routes).
 */
export async function updateSession(request: NextRequest) {
  // Clone the incoming headers and strip any client-supplied user-id header so a
  // caller can never spoof identity — only this middleware may set it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);

  // If Supabase isn't configured yet, don't gate anything (design-preview mode).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Collect any cookies Supabase refreshes during getUser() so we can attach
  // them to the final response once, instead of rebuilding it mid-flight.
  const refreshedCookies: CookieToSet[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          refreshedCookies.push(...cookiesToSet);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Forward the validated id downstream so Server Components can resolve the
  // active org without a second auth.getUser() round-trip.
  if (user) requestHeaders.set(USER_ID_HEADER, user.id);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  refreshedCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}

/**
 * middleware.ts — Session refresh + route protection.
 *
 * Runs on every matched request. It (1) refreshes the Supabase auth session so
 * the cookie never silently expires, and (2) bounces signed-out visitors away
 * from the protected app pages to /login.
 *
 * Public pages (landing, login, marketing/evidence pages, API routes) are left
 * open. API routes do their own per-request auth via lib/user.ts.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// App pages that require a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/adjudicate",
  "/claims",
  "/customers",
  "/analytics",
  "/query",
  "/map",
  "/policy",
  "/sla",
  "/api-docs",
];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured we can't gate — let the request through so the
  // app still renders (it will surface its own "not configured" errors).
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token and refreshes the cookie.
  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  if (isProtected && !user) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

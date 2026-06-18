/**
 * supabase/server.ts — Server-side Supabase client bound to request cookies.
 *
 * Used in API routes, server components, and middleware to read the signed-in
 * user from the session cookie (auth.getUser()). It does NOT use the service
 * key — it only establishes WHO the caller is. The actual privileged DB queries
 * still run through getServiceClient() in lib/supabase.ts, filtered by the
 * user id we trust from here.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createSupabaseServerClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie writes are not allowed there.
          // The middleware refreshes the session cookie, so this is safe to ignore.
        }
      },
    },
  });
}

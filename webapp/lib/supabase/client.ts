/**
 * supabase/client.ts — Browser-side Supabase client (auth only).
 *
 * Used by client components (login form, sign-out button) to sign users in/out
 * and read the current session. The session is persisted in cookies by
 * @supabase/ssr, so it survives reloads and is readable by the server.
 *
 * This is the ANON-key client — it can only do what Row Level Security allows.
 * Privileged DB work still goes through the service client in lib/supabase.ts.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, anon);
}

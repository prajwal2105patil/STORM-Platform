import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: ReturnType<typeof createClient> | null = null;

// Lazy-load client-side client (anon key — respects RLS)
// Only creates client if env vars are present
export function getClient() {
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error(
      `Supabase client not available. Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!supabaseAnon ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`.trim()
    );
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnon);
  }
  return cachedClient;
}

// Backward compatibility: export as supabase (lazy)
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_, prop) => {
    try {
      return Reflect.get(getClient(), prop);
    } catch (err) {
      console.error("Supabase client error:", err);
      throw err;
    }
  },
});

// Server-side client (service key — bypasses RLS, use in API routes only)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      `Service client not available. Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!serviceKey ? "SUPABASE_SERVICE_KEY" : ""}`.trim()
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

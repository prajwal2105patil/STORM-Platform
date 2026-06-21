import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cache clients at module level — created once, reused across requests
let cachedAnonClient: ReturnType<typeof createClient> | null = null;
let cachedServiceClient: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error(`Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!supabaseAnon ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`.trim());
  }
  if (!cachedAnonClient) {
    cachedAnonClient = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false },
      global: { headers: { "x-application": "dreadnought-asre" } },
    });
  }
  return cachedAnonClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_, prop) => Reflect.get(getClient(), prop),
});

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(`Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!serviceKey ? "SUPABASE_SERVICE_KEY" : ""}`.trim());
  }
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { "x-application": "dreadnought-asre-service" } },
    });
  }
  // No generated DB types yet — suppress `never` on .from() until `supabase gen types` is run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cachedServiceClient as any;
}

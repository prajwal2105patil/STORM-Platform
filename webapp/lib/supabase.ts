import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedAnonClient: ReturnType<typeof createClient<Database>> | null = null;
let cachedServiceClient: ReturnType<typeof createClient<Database>> | null = null;

export function getClient() {
  if (!supabaseUrl || !supabaseAnon) {
    throw new Error(`Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!supabaseAnon ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`.trim());
  }
  if (!cachedAnonClient) {
    cachedAnonClient = createClient<Database>(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false },
      global: { headers: { "x-application": "dreadnought-asre" } },
    });
  }
  return cachedAnonClient;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get: (_, prop) => Reflect.get(getClient(), prop),
});

export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(`Missing: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!serviceKey ? "SUPABASE_SERVICE_KEY" : ""}`.trim());
  }
  if (!cachedServiceClient) {
    cachedServiceClient = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { "x-application": "dreadnought-asre-service" } },
    });
  }
  return cachedServiceClient;
}

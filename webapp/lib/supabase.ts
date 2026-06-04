import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error("FATAL: Missing Supabase environment variables", {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon ? "SET" : "MISSING"
  });
}

// Client-side client (anon key — respects RLS)
export const supabase = createClient(supabaseUrl || "", supabaseAnon || "");

// Server-side client (service key — bypasses RLS, use in API routes only)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("FATAL: getServiceClient missing vars", {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "SET" : "MISSING",
      SUPABASE_SERVICE_KEY: serviceKey ? "SET" : "MISSING"
    });
  }

  return createClient(supabaseUrl || "", serviceKey || "", {
    auth: { persistSession: false },
  });
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side client (anon key — respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnon);

// Server-side client (service key — bypasses RLS, use in API routes only)
export function getServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });
}

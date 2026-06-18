import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getProfile } from "@/lib/user";

export async function GET(req: NextRequest) {
  // Claims carry petitioner / asset / financial PII. A signed-in user may see
  // ONLY their own claims; an admin (profiles.role = 'admin') sees everything.
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const isAdmin = profile.role === "admin";

  const { searchParams } = new URL(req.url);
  const page     = parseInt(searchParams.get("page")   || "1");
  const limit    = parseInt(searchParams.get("limit")  || "20");
  const status   = searchParams.get("status");
  const customer = searchParams.get("customer_id");
  const from     = (page - 1) * limit;

  const supabase = getServiceClient();
  let query = supabase
    .from("claim_summary")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, from + limit - 1);

  // Non-admins are scoped to their own user_id. This is the real enforcement
  // boundary (the service key bypasses RLS).
  if (!isAdmin) query = query.eq("user_id", profile.id);

  if (status)   query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data, total: count, page, limit });
}

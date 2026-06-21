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
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const status   = searchParams.get("status");
  const customer = searchParams.get("customer_id");
  const from     = (page - 1) * limit;

  const supabase = getServiceClient();
  // Query claims table directly (claim_summary view lacks user_id/customer_id)
  let query = supabase
    .from("claims")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(from, from + limit - 1);

  // Non-admins are scoped to their own user_id (pending multi-user migration)
  if (!isAdmin) query = query.eq("user_id" as string, profile.id);

  if (status)   query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data, total: count, page, limit });
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Claims carry petitioner / asset / financial PII. Admin-only — the registry
  // must not be publicly enumerable (it also leaks the UUIDs used by the
  // evidence-report route). Consistent with /api/customers and /api/policy.
  const denied = requireAdmin(req);
  if (denied) return denied;

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

  if (status)   query = query.eq("status", status);
  if (customer) query = query.eq("customer_id", customer);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: data, total: count, page, limit });
}

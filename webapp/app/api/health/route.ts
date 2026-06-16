import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/health — lightweight, public liveness check.
 *
 * Used by the sidebar status footer so the indicators reflect REAL state
 * instead of being hardcoded green. Does one cheap head-count against Supabase
 * and reports whether the Groq key is configured (without exposing it).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let supabase = false;
  try {
    const sb = getServiceClient();
    const { error } = await sb
      .from("stations")
      .select("id", { count: "exact", head: true });
    supabase = !error;
  } catch {
    supabase = false;
  }

  return NextResponse.json({
    ok: supabase,
    asre: true, // engine is in-process; if this route responds, it's up
    supabase,
    groq: !!process.env.GROQ_API_KEY,
    ts: new Date().toISOString(),
  });
}

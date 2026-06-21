import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getServiceClient } from "@/lib/supabase";

/**
 * GET /api/cron/keepalive
 *
 * Free-tier Supabase projects auto-pause after 7 days of zero activity. A
 * daily Vercel Cron hit (see webapp/vercel.json) runs one trivial query so the
 * project never sleeps — keeping the live demo always-on at $0.
 *
 * Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` when the
 * CRON_SECRET env var is set, so the endpoint can't be abused to spin the DB.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Fail CLOSED, mirroring requireAdmin in lib/auth.ts: an unconfigured secret
  // must NOT leave this DB-touching endpoint publicly hammerable. Vercel Cron
  // auto-sends `Authorization: Bearer ${CRON_SECRET}` — set CRON_SECRET in the
  // Vercel env or this route (and the keepalive) will correctly refuse to run.
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "Cron auth not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const ta = Buffer.from(token);
  const tb = Buffer.from(secret);
  if (ta.length !== tb.length || !timingSafeEqual(ta, tb)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("stations")
      .select("id", { count: "exact", head: true });
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      stations: count,
      ts: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "keepalive failed" },
      { status: 500 }
    );
  }
}

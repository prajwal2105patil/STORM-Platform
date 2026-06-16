import { NextRequest, NextResponse } from "next/server";
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
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

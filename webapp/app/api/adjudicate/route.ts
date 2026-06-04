import { NextRequest, NextResponse } from "next/server";
import { adjudicate } from "@/lib/asre";
import { getServiceClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/ratelimit";
import { ClaimPayload } from "@/types";
import { z } from "zod";

// ── Input schema (Pydantic equivalent for TypeScript) ────────────────────────
const ClaimSchema = z.object({
  petitioner:        z.string().min(1),
  respondent:        z.string().optional(),
  asset_name:        z.string().min(1),
  asset_type:        z.string().optional(),
  asset_lat:         z.number().min(-90).max(90),
  asset_lon:         z.number().min(-180).max(180),
  asset_capacity_mw: z.number().optional(),
  start_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claimed_cause:     z.string().min(1),
  claimed_loss_inr:  z.number().optional(),
  customer_id:       z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit: 10 claims per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed, remaining, resetAt } = rateLimit(ip, "adjudicate", 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 claims per minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const payload = parsed.data as ClaimPayload;

  try {
    const result = await adjudicate(payload);

    // Persist to Supabase
    const supabase = getServiceClient();
    const { data: saved } = await supabase
      .from("claims")
      .insert([{
        customer_id:        payload.customer_id || null,
        petitioner:         payload.petitioner,
        respondent:         payload.respondent || null,
        asset_name:         payload.asset_name,
        asset_type:         payload.asset_type || null,
        asset_lat:          payload.asset_lat,
        asset_lon:          payload.asset_lon,
        asset_capacity_mw:  payload.asset_capacity_mw || null,
        start_date:         payload.start_date,
        end_date:           payload.end_date,
        claimed_cause:      payload.claimed_cause,
        claimed_loss_inr:   payload.claimed_loss_inr || null,
        status:             "adjudicated",
        adjudication_label: result.label,
        nearest_station_id: null,  // resolved in background
        nearest_station_km: result.nearest_station_km || null,
        peak_wind_ms:       result.peak_wind_ms || null,
        exceedance_hours:   result.exceedance_hours || null,
        idw_confidence:     result.idw_confidence || null,
        processing_ms:      result.processing_ms,
        adjudication_json:  result,
        adjudicated_at:     new Date().toISOString(),
      }] as any[])
      .select()
      .single();

    // Audit log (fire-and-forget — don't block response)
    supabase.from("audit_log").insert([{
      claim_id:   saved?.id,
      event_type: "adjudicated",
      actor:      "ASRE-v2",
      payload:    { label: result.label, node_path: result.node_path },
    }] as any[]).then(() => {}).catch(console.error);

    return NextResponse.json({ claim_id: saved?.id, ...result }, { status: 200 });
  } catch (err: any) {
    console.error("ASRE adjudication error:", err);
    return NextResponse.json(
      { error: "Adjudication engine error", message: err?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "DREADNOUGHT ASRE v2",
    status:  "operational",
    endpoints: { POST: "/api/adjudicate" },
    thresholds: {
      wind_threshold_ms: 17.2,
      exceedance_hours:  3,
      max_range_km:      300,
    },
  });
}

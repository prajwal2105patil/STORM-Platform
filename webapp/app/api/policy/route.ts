import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getServiceClient();

  const [stationsRes, auditRes] = await Promise.all([
    supabase.from("stations").select("*"),
    supabase
      .from("audit_log")
      .select("*, claims(petitioner, asset_name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const stations = stationsRes.data || [];
  const audit_log = auditRes.data || [];

  const thresholds = {
    wind_threshold_ms: 17.2,
    max_range_km: 300,
    exceedance_hours: 3,
    idw_power: 2,
  };

  return NextResponse.json({
    thresholds,
    stations,
    audit_log,
  });
}

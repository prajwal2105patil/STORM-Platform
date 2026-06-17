import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

/**
 * HTML-escape any value before it is interpolated into the report markup.
 * Claim fields (petitioner, asset_name, claimed_cause, respondent, …) originate
 * from the PUBLIC /api/adjudicate endpoint, so they are attacker-controllable.
 * Without escaping, a claim submitted with `<script>` in any text field would
 * execute when this report is opened — a stored XSS. Escaping renders all such
 * values as inert text.
 */
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  const { data: claim, error } = await supabase
    .from("claims")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const verdict = esc(claim.adjudication_label || "PENDING");
  const isValidated = claim.adjudication_label === "VALIDATED";
  const date = new Date(claim.submitted_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ASRE Evidence Report — ${claim.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a2e; background: white; padding: 48px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a3a5c; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 22px; font-weight: bold; color: #1a3a5c; letter-spacing: 2px; }
    .logo span { display: block; font-size: 11px; color: #666; letter-spacing: 1px; font-weight: normal; margin-top: 4px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; color: #1a3a5c; }
    .doc-title p { font-size: 11px; color: #666; margin-top: 4px; }
    .verdict-banner { padding: 20px 24px; border-radius: 8px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px; }
    .verdict-banner.validated { background: #f0fdf4; border: 2px solid #16a34a; }
    .verdict-banner.rejected { background: #fef2f2; border: 2px solid #dc2626; }
    .verdict-icon { font-size: 36px; }
    .verdict-text h2 { font-size: 20px; font-weight: bold; }
    .verdict-text.validated h2 { color: #16a34a; }
    .verdict-text.rejected h2 { color: #dc2626; }
    .verdict-text p { font-size: 13px; color: #555; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section h3 { font-size: 13px; font-weight: bold; letter-spacing: 1px; color: #1a3a5c; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { padding: 12px; background: #f9fafb; border-radius: 6px; }
    .field label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
    .field value { font-size: 14px; color: #1a1a2e; font-weight: 500; display: block; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 28px; }
    .metric { text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
    .metric .val { font-size: 22px; font-weight: bold; color: #1a3a5c; display: block; }
    .metric .lbl { font-size: 10px; color: #888; margin-top: 4px; display: block; }
    .legal-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; font-size: 12px; color: #78350f; line-height: 1.6; }
    .node-path { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .node { padding: 4px 12px; background: #1a3a5c; color: white; border-radius: 20px; font-size: 11px; }
    .arrow { color: #999; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; }
    .stamp { text-align: right; }
    .stamp .validated { color: #16a34a; font-weight: bold; font-size: 14px; letter-spacing: 2px; }
    .stamp .rejected { color: #dc2626; font-weight: bold; font-size: 14px; letter-spacing: 2px; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="position:fixed;top:20px;right:20px;padding:10px 20px;background:#1a3a5c;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
    Print / Save PDF
  </button>

  <div class="header">
    <div class="logo">
      DREADNOUGHT
      <span>ASRE Platform v2 — Automated Storm-Related Events</span>
    </div>
    <div class="doc-title">
      <h1>Evidence Report</h1>
      <p>Claim ID: ${esc(claim.id)}</p>
      <p>Generated: ${esc(date)}</p>
      <p>NOAA Rule 803(8) Certified</p>
    </div>
  </div>

  <div class="verdict-banner ${isValidated ? "validated" : "rejected"}">
    <div class="verdict-icon">${isValidated ? "✅" : "❌"}</div>
    <div class="verdict-text ${isValidated ? "validated" : "rejected"}">
      <h2>${verdict.replace(/_/g, " ")}</h2>
      <p>${esc(claim.adjudication_json?.legal_summary || "No legal summary available.")}</p>
    </div>
  </div>

  <div class="metrics">
    <div class="metric">
      <span class="val">${claim.peak_wind_ms ? `${claim.peak_wind_ms} m/s` : "—"}</span>
      <span class="lbl">Peak Wind Speed</span>
    </div>
    <div class="metric">
      <span class="val">${claim.exceedance_hours !== null ? `${claim.exceedance_hours}h` : "—"}</span>
      <span class="lbl">Exceedance Hours</span>
    </div>
    <div class="metric">
      <span class="val">${claim.nearest_station_km !== null ? `${claim.nearest_station_km} km` : "—"}</span>
      <span class="lbl">Station Distance</span>
    </div>
    <div class="metric">
      <span class="val">${claim.processing_ms ? `${claim.processing_ms}ms` : "—"}</span>
      <span class="lbl">Processing Time</span>
    </div>
  </div>

  <div class="section">
    <h3>Claim Details</h3>
    <div class="grid">
      <div class="field"><label>Petitioner</label><value>${esc(claim.petitioner)}</value></div>
      <div class="field"><label>Respondent</label><value>${esc(claim.respondent || "—")}</value></div>
      <div class="field"><label>Asset / Project</label><value>${esc(claim.asset_name)}</value></div>
      <div class="field"><label>Asset Type</label><value>${esc(claim.asset_type || "—")}</value></div>
      <div class="field"><label>Asset Coordinates</label><value>${esc(claim.asset_lat)}°N, ${esc(claim.asset_lon)}°E</value></div>
      <div class="field"><label>Claimed Cause</label><value>${esc(claim.claimed_cause)}</value></div>
      <div class="field"><label>Claim Period</label><value>${esc(claim.start_date)} → ${esc(claim.end_date)}</value></div>
      <div class="field"><label>Claimed Loss</label><value>${claim.claimed_loss_inr ? `₹${esc(Number(claim.claimed_loss_inr).toLocaleString("en-IN"))}` : "—"}</value></div>
    </div>
  </div>

  <div class="section">
    <h3>ASRE Adjudication Pipeline</h3>
    <div class="node-path">
      ${(claim.adjudication_json?.node_path || []).map((n: string, i: number, arr: string[]) =>
        `<span class="node">${esc(n)}</span>${i < arr.length - 1 ? '<span class="arrow">→</span>' : ''}`
      ).join("")}
    </div>
  </div>

  <div class="section">
    <h3>Legal Admissibility</h3>
    <div class="legal-box">
      <strong>Evidence Basis:</strong> NOAA Integrated Surface Database (ISD), Station: ${esc(claim.adjudication_json?.nearest_station || "—")}.
      Weather data admitted as public records under <strong>Federal Rule of Evidence 803(8)</strong>.
      Adjudication performed deterministically by ASRE v2 engine with no human intervention.
      Wind threshold applied: 17.2 m/s (Beaufort Scale Force 8). Exceedance requirement: ≥ 3 hours.
      IDW Confidence: ${claim.idw_confidence ? `${(claim.idw_confidence * 100).toFixed(1)}%` : "—"}.
    </div>
  </div>

  <div class="footer">
    <div>
      <p>DREADNOUGHT ASRE v2 — Automated Storm-Related Events Engine</p>
      <p>This report is system-generated and legally admissible under NOAA Rule 803(8).</p>
    </div>
    <div class="stamp">
      <p class="${isValidated ? "validated" : "rejected"}">${verdict}</p>
      <p style="font-size:10px;color:#aaa;margin-top:4px;">Adjudicated: ${claim.adjudicated_at ? new Date(claim.adjudicated_at).toLocaleString("en-IN") : date}</p>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

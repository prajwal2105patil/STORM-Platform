import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const NOTIFY_TO = process.env.NOTIFY_EMAIL || "prajwal2105patil@gmail.com";
const FROM = "DREADNOUGHT ASRE <onboarding@resend.dev>";

export async function notifyAdjudication(claim: {
  id: string;
  petitioner: string;
  asset_name: string;
  label: string;
  peak_wind_ms: number | null;
  exceedance_hours: number | null;
  nearest_station: string | null;
  processing_ms: number;
}) {
  if (!resend) return;

  const isValidated = claim.label === "VALIDATED";
  const emoji = isValidated ? "✅" : "❌";

  try {
    await resend.emails.send({
      from: FROM,
      to: NOTIFY_TO,
      subject: `${emoji} ${claim.label} — ${claim.petitioner} / ${claim.asset_name}`,
      html: `
        <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:${isValidated ? "#16a34a" : "#dc2626"};margin:0 0 8px 0;">
            ${emoji} ${claim.label.replace(/_/g, " ")}
          </h2>
          <p style="color:#666;margin:0 0 20px 0;">Claim ${claim.id.slice(0, 8)}... adjudicated in ${claim.processing_ms}ms</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Petitioner</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${claim.petitioner}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Asset</td><td style="padding:8px;border-bottom:1px solid #eee;">${claim.asset_name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Peak Wind</td><td style="padding:8px;border-bottom:1px solid #eee;">${claim.peak_wind_ms ?? "—"} m/s</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Exceedance</td><td style="padding:8px;border-bottom:1px solid #eee;">${claim.exceedance_hours ?? "—"} hours</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#888;">Station</td><td style="padding:8px;border-bottom:1px solid #eee;">${claim.nearest_station ?? "—"}</td></tr>
          </table>
          <p style="color:#aaa;font-size:11px;margin-top:20px;">DREADNOUGHT ASRE · Decision-support only · Not legal advice</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email notification failed:", err);
  }
}

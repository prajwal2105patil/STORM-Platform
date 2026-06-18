// ── Core ASRE Types ────────────────────────────────────────────────────────

export type AdjudicationLabel =
  | "VALIDATED"
  | "REJECTED_BELOW_THRESHOLD"
  | "REJECTED_WRONG_MONTH"
  | "REJECTED_NON_WEATHER"
  | "REJECTED_MALFORMED_COORDS"
  | "REJECTED_MISSING_DATES"
  | "INSUFFICIENT_DATA"
  | "PENDING";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state: string;
}

export interface WeatherStats {
  station_id: string;
  year: number;
  month: number;
  n_observations: number;
  avg_wind_ms: number;
  peak_wind_ms: number;
  p95_wind_ms: number;
  exceedance_hours: number;
  gale_confirmed: boolean;
}

export interface ClaimPayload {
  petitioner: string;
  respondent?: string;
  asset_name: string;
  asset_type?: string;
  asset_lat: number;
  asset_lon: number;
  asset_capacity_mw?: number;
  start_date: string;   // YYYY-MM-DD
  end_date: string;     // YYYY-MM-DD
  claimed_cause: string;
  claimed_loss_inr?: number;
  customer_id?: string;
}

export interface AdjudicationResult {
  label: AdjudicationLabel;
  petitioner: string;
  asset_name: string;
  start_date: string;
  end_date: string;
  nearest_station?: string;
  nearest_station_km?: number;
  peak_wind_ms?: number;
  exceedance_hours?: number;
  idw_confidence?: number;
  processing_ms: number;
  node_path: string[];
  legal_summary: string;
  timestamp: string;
  nearest_station_id?: string;
}

export interface Claim {
  id: string;
  customer_id?: string;
  petitioner: string;
  respondent?: string;
  asset_name: string;
  asset_type?: string;
  asset_lat: number;
  asset_lon: number;
  start_date: string;
  end_date: string;
  claimed_cause: string;
  claimed_loss_inr?: number;
  status: string;
  adjudication_label?: AdjudicationLabel;
  nearest_station_id?: string;
  nearest_station_km?: number;
  peak_wind_ms?: number;
  exceedance_hours?: number;
  processing_ms?: number;
  submitted_at: string;
  adjudicated_at?: string;
}

export interface Customer {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  sector?: string;
  account_status: string;
  total_claims: number;
  approved_claims: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  claim_id?: string;
  event_type: "submitted" | "adjudicated" | "escalated" | "overridden";
  actor: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSnapshot {
  total_claims: number;
  validated: number;
  rejected: number;
  pending: number;
  approval_rate: number;
  avg_processing_ms: number;
  hallucinations_avoided_proj: number; // benchmark-projected, not a measured count
  total_customers: number;
}

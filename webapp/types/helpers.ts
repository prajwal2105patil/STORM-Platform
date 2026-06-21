import type { Database } from "./supabase";

export type ClaimRow = Database["public"]["Tables"]["claims"]["Row"];
export type ClaimInsert = Database["public"]["Tables"]["claims"]["Insert"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type AuditLogInsert = Database["public"]["Tables"]["audit_log"]["Insert"];
export type StationRow = Database["public"]["Tables"]["stations"]["Row"];
export type ClaimSummaryRow = Database["public"]["Views"]["claim_summary"]["Row"];

export interface AdjudicationJson {
  label: string;
  legal_summary?: string;
  nearest_station?: string;
  nearest_station_id?: string;
  nearest_station_km?: number;
  peak_wind_ms?: number;
  exceedance_hours?: number;
  idw_confidence?: number;
  node_path?: string[];
  processing_ms?: number;
}

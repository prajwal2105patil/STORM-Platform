import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock Supabase: a chainable, awaitable query builder whose result is keyed
//    by table name via a hoisted, per-test mutable `responses` map. ───────────
const h = vi.hoisted(() => {
  const responses: Record<string, { data: any; error: any }> = {};
  const makeBuilder = (table: string) => {
    const b: any = {};
    const methods = [
      "select", "eq", "or", "order", "limit", "ilike", "gt", "lt", "neq",
      "range", "single", "insert", "update", "delete", "upsert",
    ];
    for (const m of methods) b[m] = () => b;
    b.then = (resolve: any, reject: any) =>
      Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve, reject);
    return b;
  };
  return { responses, client: { from: (t: string) => makeBuilder(t) } };
});

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => h.client,
  getClient: () => h.client,
}));

import { adjudicate } from "@/lib/asre";
import type { ClaimPayload } from "@/types";

const STATIONS = [
  { id: "428400", name: "Surat",          lat: 21.2,  lon: 72.83, state: "" },
  { id: "430570", name: "Bombay / Colaba", lat: 18.9, lon: 72.82, state: "" },
  { id: "432790", name: "Chennai Intl",   lat: 12.99, lon: 80.18, state: "" },
];

function claim(over: Partial<ClaimPayload> = {}): ClaimPayload {
  return {
    petitioner: "ACME Energy",
    asset_name: "Solar Farm A",
    asset_lat: 21.2,
    asset_lon: 72.83,
    start_date: "2022-08-01",
    end_date: "2022-08-15",
    claimed_cause: "cyclone",
    ...over,
  };
}

beforeEach(() => {
  h.responses["stations"] = { data: STATIONS, error: null };
  h.responses["weather_monthly_stats"] = { data: [], error: null };
});

describe("adjudicate", () => {
  it("VALIDATED when peak wind clears the gale threshold", async () => {
    h.responses["weather_monthly_stats"] = {
      data: [{ station_id: "428400", year: 2022, month: 8, peak_wind_ms: 21, exceedance_hours: 6, avg_wind_ms: 9, p95_wind_ms: 18 }],
      error: null,
    };
    const r = await adjudicate(claim());
    expect(r.label).toBe("VALIDATED");
    expect(r.peak_wind_ms!).toBeGreaterThanOrEqual(17.2);
  });

  it("REJECTED_BELOW_THRESHOLD when wind is below the gale threshold", async () => {
    h.responses["weather_monthly_stats"] = {
      data: [{ station_id: "428400", year: 2022, month: 8, peak_wind_ms: 9, exceedance_hours: 0, avg_wind_ms: 3, p95_wind_ms: 7 }],
      error: null,
    };
    const r = await adjudicate(claim());
    expect(r.label).toBe("REJECTED_BELOW_THRESHOLD");
  });

  it("REJECTED_WRONG_MONTH when no weather rows cover the window", async () => {
    h.responses["weather_monthly_stats"] = { data: [], error: null };
    const r = await adjudicate(claim());
    expect(r.label).toBe("REJECTED_WRONG_MONTH");
  });

  it("INSUFFICIENT_DATA when no station is within range", async () => {
    const r = await adjudicate(claim({ asset_lat: 78, asset_lon: 10 }));
    expect(r.label).toBe("INSUFFICIENT_DATA");
  });

  it("REJECTED_MALFORMED_COORDS for null island", async () => {
    const r = await adjudicate(claim({ asset_lat: 0, asset_lon: 0 }));
    expect(r.label).toBe("REJECTED_MALFORMED_COORDS");
  });

  it("REJECTED_MISSING_DATES when end precedes start", async () => {
    const r = await adjudicate(claim({ start_date: "2022-08-15", end_date: "2022-08-01" }));
    expect(r.label).toBe("REJECTED_MISSING_DATES");
  });

  it("REJECTED_NON_WEATHER for a non-weather cause", async () => {
    const r = await adjudicate(claim({ claimed_cause: "office fire" }));
    expect(r.label).toBe("REJECTED_NON_WEATHER");
  });

  it("REJECTED_NON_WEATHER for a negated weather cause", async () => {
    const r = await adjudicate(claim({ claimed_cause: "there was no storm at all" }));
    expect(r.label).toBe("REJECTED_NON_WEATHER");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => {
  const responses: Record<string, { data: any; error: any }> = {};
  const makeBuilder = (table: string) => {
    const b: any = {};
    const methods = ["select", "eq", "or", "order", "limit", "ilike", "single", "range"];
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

import { queryWeather } from "@/lib/nlq";

const STATIONS = [
  { id: "428400", name: "Surat" },
  { id: "430570", name: "Bombay / Colaba" },
  { id: "432790", name: "Chennai Intl" },
  { id: "423480", name: "Jaipur" },
];

beforeEach(() => {
  h.responses["stations"] = { data: STATIONS, error: null };
  h.responses["weather_monthly_stats"] = {
    data: [{ peak_wind_ms: 5.1, avg_wind_ms: 2.0, p95_wind_ms: 4.0, exceedance_hours: 3, year: 2023, month: 8 }],
    error: null,
  };
});

describe("queryWeather", () => {
  it("resolves the 'Mumbai' alias to the live 'Bombay / Colaba' station", async () => {
    const r = await queryWeather("peak wind in Mumbai in August 2023");
    expect(r.station).toBe("Bombay / Colaba");
    expect(r.value).toBe(5.1);
    expect(r.confidence).toBe(1);
  });

  it("detects the average-wind metric and reads the right column", async () => {
    const r = await queryWeather("average wind in Surat July 2022");
    expect(r.metric).toBe("average wind");
    expect(r.value).toBe(2.0);
  });

  it("detects gale-force hours", async () => {
    const r = await queryWeather("how many gale force hours in Chennai 2016");
    expect(r.metric).toBe("gale force");
    expect(r.value).toBe(3);
  });

  it("falls back to most-recent record when no date is given", async () => {
    const r = await queryWeather("peak wind in Jaipur");
    expect(r.station).toBe("Jaipur");
    expect(r.year).toBe(2023);
    expect(r.value).toBe(5.1);
  });

  it("returns Unknown gracefully for an unrecognised place", async () => {
    const r = await queryWeather("weather in Atlantis");
    expect(r.station).toBe("Unknown");
    expect(r.value).toBeNull();
    expect(r.confidence).toBe(0);
  });
});

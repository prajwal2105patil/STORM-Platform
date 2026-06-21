import { NextRequest, NextResponse } from "next/server";
import { queryWeather } from "@/lib/nlq";
import { rateLimit } from "@/lib/ratelimit";
import { z } from "zod";

const QuerySchema = z.object({
  question: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Rate limit: 30 queries per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const { allowed, remaining, resetAt } = await rateLimit(ip, "query", 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 queries per minute." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "30",
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

  const parsed = QuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Schema validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const result = await queryWeather(parsed.data.question);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("Query API error:", err);
    return NextResponse.json(
      { error: "Query processing failed" },
      { status: 500 }
    );
  }
}

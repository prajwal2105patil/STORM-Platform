import { NextRequest, NextResponse } from "next/server";
import { queryWeather } from "@/lib/nlq";
import { z } from "zod";

const QuerySchema = z.object({
  question: z.string().min(1),
});

export async function POST(req: NextRequest) {
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
    // Extract origin from request headers
    let origin: string | undefined;
    const headerOrigin = req.headers.get("origin");
    const proto = req.headers.get("x-forwarded-proto");
    const host = req.headers.get("x-forwarded-host");

    if (headerOrigin) {
      origin = headerOrigin;
    } else if (proto && host) {
      origin = `${proto}://${host}`;
    }

    console.log("[Query API] origin:", origin);
    const result = await queryWeather(parsed.data.question, origin);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Query API error:", err);
    return NextResponse.json(
      { error: "Query processing error", message: err?.message },
      { status: 500 }
    );
  }
}

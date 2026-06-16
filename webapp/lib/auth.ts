/**
 * auth.ts — Shared-secret gate for admin/CRM write endpoints.
 *
 * The service-role key (used by every API route) bypasses Row Level Security,
 * so any UNGUARDED mutating route is effectively a public write to the whole
 * database. This guard requires a Bearer token equal to ADMIN_API_SECRET on
 * admin writes (customer create/update). Public product endpoints
 * (adjudicate, query) stay open but are rate-limited.
 *
 * FAILS CLOSED: if ADMIN_API_SECRET is not configured, every guarded write is
 * denied. Better a broken admin form than an open database.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // Length must match for timingSafeEqual; compare against a fixed-size hash-ish
  // buffer to avoid leaking length. Simplest: bail if lengths differ.
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Returns a 401/503 NextResponse if the request is NOT authorized, or null if
 * it IS authorized. Usage:
 *
 *   const denied = requireAdmin(req);
 *   if (denied) return denied;
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_API_SECRET;

  // Fail closed: no secret configured → deny all guarded writes.
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "Server auth not configured" },
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || !safeEqual(token, secret)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  return null;
}

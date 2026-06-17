import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/**
 * POST /api/admin/verify — confirm an admin key BEFORE the client stores it.
 *
 * The login page calls this on submit so a wrong password is rejected at
 * sign-in, instead of silently "logging in" (writing any string to
 * sessionStorage) and only failing later on the first write. Returns 200 when
 * the Bearer token equals ADMIN_API_SECRET; 401 (wrong key) or 503 (server
 * secret not configured) otherwise — both surfaced via requireAdmin().
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ ok: true });
}

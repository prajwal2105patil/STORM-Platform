import { NextResponse } from "next/server";
import { getProfile } from "@/lib/user";

/**
 * /api/me — the signed-in user's own profile (id, username, full_name, role).
 * Returns { user: null } when not signed in (200, not 401) so the client can
 * render an auth-aware sidebar without treating "logged out" as an error.
 */
export async function GET() {
  const profile = await getProfile();
  return NextResponse.json({ user: profile });
}

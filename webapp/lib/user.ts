/**
 * user.ts — Server-side identity & authorization for API routes.
 *
 * Replaces the single shared-secret gate (lib/auth.ts) for data routes with
 * real per-user identity from Supabase Auth:
 *
 *   - getSessionUser()  → the signed-in auth user (or null)
 *   - getProfile()      → profile row incl. role ('user' | 'admin')
 *   - requireAuth()     → 401 unless signed in; else returns { user }
 *   - requireAdminUser()→ 401 unless signed in AND role = 'admin'
 *
 * Authorization model (per product decision):
 *   - Any signed-in user may read/manage ONLY their own claims.
 *   - Admins (profiles.role = 'admin') may read everything + CRM/policy.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string;
}

/** The signed-in auth user, or null if no valid session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** The signed-in user's profile row (role, username, …), or null. */
export async function getProfile(): Promise<UserProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  // Read via the service client so RLS can't hide the row from us; we already
  // know the id from the verified session, so this is a trusted lookup.
  const svc = getServiceClient();
  // profiles table is created by the multi-user auth migration; cast through
  // unknown until then (getServiceClient() returns a typed client).
  const { data } = await (svc as any)
    .from("profiles")
    .select("id, username, full_name, email, role")
    .eq("id", user.id)
    .single();
  if (!data) {
    return { id: user.id, username: null, full_name: null, email: user.email, role: "user" };
  }
  return data as unknown as UserProfile;
}

/**
 * Gate: requires a signed-in user. Returns { user } on success, or a 401
 * NextResponse on failure. Usage:
 *
 *   const gate = await requireAuth();
 *   if (gate instanceof NextResponse) return gate;
 *   const { user } = gate;
 */
export async function requireAuth(): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  return { user };
}

/**
 * Gate: requires a signed-in ADMIN. Returns { profile } on success, or a
 * 401/403 NextResponse on failure.
 */
export async function requireAdminUser(): Promise<{ profile: UserProfile } | NextResponse> {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return { profile };
}

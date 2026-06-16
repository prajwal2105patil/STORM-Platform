/**
 * admin-token.ts — Client-side accessor for the pilot admin write-key.
 *
 * The key is the password typed on the login page (see login-1.tsx). It lives
 * only in this browser's sessionStorage and is sent as a Bearer token on admin
 * writes, where the server checks it against ADMIN_API_SECRET (see lib/auth.ts).
 * It is never bundled into the build and never a NEXT_PUBLIC_ var.
 */
export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("asre_admin_key") || "";
}

/** Authorization header for admin write requests. */
export function adminAuthHeader(): Record<string, string> {
  const key = getAdminKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

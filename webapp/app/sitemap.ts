import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Public, indexable routes. Admin/CRM and raw API routes are intentionally omitted.
const ROUTES = [
  "", "/dashboard", "/adjudicate", "/claims", "/analytics", "/query",
  "/benchmark", "/methodology", "/data-sources", "/map", "/sla", "/api-docs", "/policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}

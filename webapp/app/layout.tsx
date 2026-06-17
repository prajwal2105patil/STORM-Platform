import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar      from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { GlobalBackground } from "@/components/ui/global-background";

const inter = Inter({ subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:  "DREADNOUGHT ASRE | Force Majeure Adjudication Platform",
    template: "%s — DREADNOUGHT ASRE",
  },
  description:
    "Deterministic force-majeure claim adjudication in under 500ms — deterministic, no-LLM verdicts (99.7% on a reproducible 1,000-claim synthetic benchmark), backed by NOAA Rule 803(8) public records.",
  keywords: ["force majeure", "claim adjudication", "NOAA ISD", "weather data", "insurance", "ASRE", "Rule 803(8)"],
  openGraph: {
    title:       "DREADNOUGHT ASRE | Force Majeure Adjudication",
    description: "Deterministic storm-event adjudication in under 500ms · deterministic verdicts · 99.7% on a synthetic benchmark · NOAA-sourced.",
    type:        "website",
    siteName:    "DREADNOUGHT ASRE",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "DREADNOUGHT ASRE | Force Majeure Adjudication",
    description: "Deterministic storm-event adjudication · 99.7% synthetic-benchmark accuracy · NOAA Rule 803(8).",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#040810] text-white`}>
        <GlobalBackground />
        <Providers>
          <div className="relative z-10 flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

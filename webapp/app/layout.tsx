import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar      from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { GlobalBackground } from "@/components/ui/global-background";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default:  "DREADNOUGHT ASRE | Force Majeure Adjudication Platform",
    template: "%s — DREADNOUGHT ASRE",
  },
  description: "AI-powered force majeure claim adjudication in under 500ms. NOAA Rule 803(8) certified. 100% accuracy vs 78.2% baseline.",
  keywords: ["force majeure", "claim adjudication", "NOAA ISD", "weather data", "insurance", "ASRE"],
  openGraph: {
    title:       "DREADNOUGHT ASRE | Force Majeure Adjudication",
    description: "AI-powered storm-related event adjudication in under 500ms.",
    type:        "website",
  },
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

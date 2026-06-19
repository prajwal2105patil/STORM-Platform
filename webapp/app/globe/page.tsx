"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { FloatingPaths } from "@/components/ui/background-paths";

// The interactive globe was a cosmetic placeholder.
// Station coverage is now handled by the full MapPage (/map) with live data.
export default function GlobePage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Coverage — DREADNOUGHT ASRE";
    const t = setTimeout(() => router.replace("/map"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div className="relative z-[1] flex flex-col items-center justify-center min-h-screen gap-6 text-center px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(13,107,142,0.35) 0%, rgba(96,184,224,0.15) 100%)",
            border: "1px solid rgba(96,184,224,0.3)",
            boxShadow: "0 0 32px rgba(96,184,224,0.2)",
          }}
        >
          <Globe2 size={28} className="text-sky/80" />
        </div>
        <div>
          <p className="text-sm font-bold text-white/70 mb-2">Station Coverage</p>
          <p className="text-white/35 text-xs">Redirecting to the interactive station map…</p>
        </div>
        <div className="flex gap-1">
          {[0, 150, 300].map((d) => (
            <span key={d} className="h-1.5 w-1.5 rounded-full bg-sky/50 animate-pulse" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

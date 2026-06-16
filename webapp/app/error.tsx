"use client";
import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#040810] overflow-hidden px-6">
      <div className="hero-mesh absolute inset-0 opacity-40" />
      <div className="relative z-10 text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <AlertTriangle size={28} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong on our end</h1>
        <p className="text-sm text-white/45 mb-2">
          The engine hit an unexpected error. Your data is safe — try again.
        </p>
        {error.digest && (
          <p className="text-[11px] text-white/25 font-mono mb-7">ref: {error.digest}</p>
        )}
        <button onClick={reset} className="btn-primary-3d">
          <RotateCcw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}

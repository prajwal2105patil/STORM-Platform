"use client";
import { FloatingPaths } from "@/components/ui/background-paths";

export function GlobalBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-[#040810]">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,107,142,0.12) 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 80% at 0% 100%, rgba(26,58,92,0.18) 0%, transparent 60%)" }}
      />
    </div>
  );
}

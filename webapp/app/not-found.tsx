import Link from "next/link";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#040810] overflow-hidden px-6">
      <div className="hero-mesh absolute inset-0 opacity-40" />
      <div className="relative z-10 text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-white/15"
          style={{ background: "linear-gradient(135deg,#0D6B8E,#1E88BE)" }}
        >
          <Compass size={28} className="text-white" />
        </div>
        <p className="text-6xl font-extrabold text-gradient-electric mb-2">404</p>
        <h1 className="text-xl font-bold text-white mb-2">This page drifted off the map</h1>
        <p className="text-sm text-white/45 mb-7">
          The route you requested doesn&apos;t exist. Let&apos;s get you back to a station with coverage.
        </p>
        <Link href="/dashboard" className="btn-primary-3d">
          <Home size={15} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

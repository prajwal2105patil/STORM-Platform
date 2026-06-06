"use client";

export function LiveBadge() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200/80 shadow-lg rounded-full px-4 py-2 text-xs font-semibold text-gray-700 select-none pointer-events-none glow-navy">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      NOAA Live · ASRE Online
    </div>
  );
}

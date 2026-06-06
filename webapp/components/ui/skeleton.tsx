import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-100", className)}
      {...props}
    />
  );
}

// Pre-built skeleton shapes for common patterns
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function SkeletonRow({ cols = 7 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={cn("h-4 bg-gray-100 rounded", i === 0 ? "w-32" : i === 3 ? "w-16 rounded-full" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

function SkeletonChart() {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-32">
        {[40, 65, 30, 80, 55, 70, 45, 90].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonRow, SkeletonChart };

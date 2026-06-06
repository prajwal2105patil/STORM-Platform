import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({ icon: Icon, label, value, sub, iconBg = "bg-[#1A3A5C]", trend, className }: StatCardProps) {
  return (
    <div className={cn(
      "relative bg-white rounded-xl border border-gray-200/80 p-5 flex items-start gap-4 overflow-hidden",
      "shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.04)]",
      "hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.09),0_2px_6px_-2px_rgba(0,0,0,0.05)]",
      "hover:-translate-y-0.5 transition-all duration-200",
      className
    )}>
      {/* Colored accent line at top */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", iconBg)} />

      <div className={cn("p-2.5 rounded-lg flex-shrink-0 mt-0.5", iconBg)}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[1.6rem] font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
        {sub && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
        {trend && (
          <p className={cn("text-xs font-semibold mt-1", trend.positive ? "text-green-600" : "text-red-500")}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}

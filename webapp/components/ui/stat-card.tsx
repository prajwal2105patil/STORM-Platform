import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon:    LucideIcon;
  label:   string;
  value:   string | number;
  sub?:    string;
  iconBg?: string;
  trend?:  { value: string; positive: boolean };
  className?: string;
  variant?: "light" | "dark";
}

export function StatCard({
  icon: Icon, label, value, sub,
  iconBg = "bg-[#1A3A5C]",
  trend, className,
  variant = "light",
}: StatCardProps) {
  const isDark = variant === "dark";

  return (
    <div className={cn(
      "relative rounded-2xl p-5 flex items-start gap-4 overflow-hidden",
      "transition-all duration-200 hover:-translate-y-1",
      isDark
        ? "glass-card-dark shadow-glass-sm hover:shadow-glass-md border"
        : "bg-white border border-gray-200/80 shadow-card hover:shadow-card-hover",
      className
    )}>
      {/* Top accent line */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", iconBg)} />

      {/* Icon */}
      <div className={cn("p-2.5 rounded-xl flex-shrink-0 mt-0.5 shadow-inner-glow", iconBg)}>
        <Icon size={20} className="text-white" />
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className={cn(
          "text-[1.65rem] font-extrabold tabular-nums leading-none tracking-tight",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {value}
        </p>
        <p className={cn(
          "text-sm font-semibold mt-1.5",
          isDark ? "text-white/60" : "text-gray-600"
        )}>
          {label}
        </p>
        {sub && (
          <p className={cn(
            "text-xs mt-0.5",
            isDark ? "text-white/30" : "text-gray-400"
          )}>
            {sub}
          </p>
        )}
        {trend && (
          <p className={cn(
            "text-xs font-semibold mt-1.5 flex items-center gap-0.5",
            trend.positive ? "text-green-500" : "text-red-500"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}

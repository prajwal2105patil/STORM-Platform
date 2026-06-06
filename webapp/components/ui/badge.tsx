import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        validated:    "bg-green-100  text-green-800  border-green-200",
        rejected:     "bg-red-100    text-red-800    border-red-200",
        pending:      "bg-amber-100  text-amber-800  border-amber-200",
        insufficient: "bg-gray-100   text-gray-700   border-gray-200",
        info:         "bg-blue-100   text-blue-800   border-blue-200",
        orange:       "bg-orange-100 text-orange-800 border-orange-200",
        purple:       "bg-purple-100 text-purple-800 border-purple-200",
        pink:         "bg-pink-100   text-pink-800   border-pink-200",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  validated:    "bg-green-500",
  rejected:     "bg-red-500",
  pending:      "bg-amber-500",
  insufficient: "bg-gray-400",
  info:         "bg-blue-500",
  orange:       "bg-orange-500",
  purple:       "bg-purple-500",
  pink:         "bg-pink-500",
};

function Badge({ className, variant = "info", dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", DOT_COLORS[variant ?? "info"])} />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };

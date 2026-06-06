import { Badge } from "@/components/ui/badge";
import type { AdjudicationLabel } from "@/types";

const VERDICT_CONFIG: Record<
  AdjudicationLabel,
  { variant: any; label: string }
> = {
  VALIDATED:                  { variant: "validated",    label: "VALIDATED"         },
  REJECTED_BELOW_THRESHOLD:   { variant: "rejected",     label: "Below Threshold"   },
  REJECTED_WRONG_MONTH:       { variant: "orange",       label: "No Data for Period"},
  REJECTED_NON_WEATHER:       { variant: "purple",       label: "Non-Weather Event" },
  REJECTED_MALFORMED_COORDS:  { variant: "pink",         label: "Invalid Coords"    },
  REJECTED_MISSING_DATES:     { variant: "pending",      label: "Missing Dates"     },
  INSUFFICIENT_DATA:          { variant: "insufficient", label: "No Station"        },
  PENDING:                    { variant: "info",         label: "Pending"           },
};

interface VerdictBadgeProps {
  label: AdjudicationLabel;
  className?: string;
}

export function VerdictBadge({ label, className }: VerdictBadgeProps) {
  const cfg = VERDICT_CONFIG[label] ?? VERDICT_CONFIG["INSUFFICIENT_DATA"];
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}

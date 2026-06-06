# UI Component Library — DREADNOUGHT ASRE

All components use CVA (class-variance-authority) + Tailwind. No Radix UI dialogs needed yet — @radix-ui/react-slot is installed for Button asChild pattern.

## Components

| File | Purpose | Key Props |
|------|---------|-----------|
| `animated-counter.tsx` | Cubic-ease count-up animation | `value`, `suffix`, `prefix`, `duration` |
| `badge.tsx` | CVA pill badge with dot indicator | `variant` (validated/rejected/pending/...) |
| `button.tsx` | CVA button with Slot support | `variant` (primary/secondary/ghost/danger), `size` |
| `card.tsx` | Compound card (Header/Title/Content/Footer) | standard div props |
| `page-header.tsx` | Consistent page title + actions slot | `title`, `description`, `actions` |
| `pipeline-tracker.tsx` | Animated 4-node LangGraph pipeline | `active: boolean`, `onComplete?` |
| `skeleton.tsx` | Pulse skeleton + SkeletonCard, SkeletonTr, SkeletonChart | className |
| `stat-card.tsx` | KPI card with icon, value, sub-label, trend | `icon`, `label`, `value`, `iconBg`, `trend` |
| `verdict-badge.tsx` | Maps AdjudicationLabel to colored Badge | `label: AdjudicationLabel` |
| `verdict-result-card.tsx` | Full adjudication result display | `result: AdjudicationResult & {claim_id?}` |

## Color System (non-negotiable)
- Navy `#1A3A5C` — primary, sidebar, buttons
- Teal `#0D6B8E` — active, hover, CTA
- Sky `#60B8E0` — hero text accents
- Validated: `bg-green-100 text-green-800`
- Rejected: `bg-red-100 text-red-800`
- Pending: `bg-amber-100 text-amber-800`

## Critical Rule: No Box-Drawing Chars in TSX
Never use ─ (U+2500) in any TSX file. It causes silent line truncation in the Edit tool.
Safe alternatives: use `=` in comments, or standard `-`.

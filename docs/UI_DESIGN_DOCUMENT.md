# DREADNOUGHT ASRE — UI Design Document
**Version 1.0 | Author: Lead Architect | Date: June 2026**

---

## 1. DESIGN PHILOSOPHY

**One sentence:** *Make the data feel like authority.*

This is not a consumer app. This is not a startup landing page. This is a legal adjudication platform used by insurance companies, energy firms, and legal operators. Every pixel must communicate **trust, speed, and precision**.

### The Three Laws of This UI:
1. **Clarity over beauty.** If a design choice looks nice but confuses the user, remove it.
2. **Data is the hero.** The UI is the frame. The verdict, the wind speed, the confidence score — those are what matter.
3. **No decoration for decoration's sake.** Every element earns its place or it doesn't exist.

### Personality:
- **Minimal:** White space is not empty. It is breathing room.
- **Authoritative:** Deep navy, sharp type, no rounded bubbly shapes.
- **Fast-feeling:** Skeleton loaders, instant feedback, sub-500ms UX responses.
- **Trustworthy:** Legal language, NOAA citations, precise numbers. No rounding errors.

---

## 2. COLOR SYSTEM

### Primary Palette (Non-negotiable):
| Name       | Hex       | Usage                                      |
|------------|-----------|--------------------------------------------|
| Navy       | `#1A3A5C` | Sidebar, primary buttons, headers          |
| Teal       | `#0D6B8E` | Active states, hover, CTA accents          |
| Sky        | `#60B8E0` | Hero text accents, highlights              |
| White      | `#FFFFFF` | Cards, backgrounds, content areas          |
| Off-white  | `#F9FAFB` | Page background, table headers             |

### Semantic Colors:
| Name       | Hex       | Usage                                      |
|------------|-----------|--------------------------------------------|
| Validated  | `#16A34A` | VALIDATED verdict, success states          |
| Rejected   | `#DC2626` | REJECTED verdict, error states             |
| Warning    | `#D97706` | Pending, caution states                    |
| Neutral    | `#6B7280` | Secondary text, disabled, N/A values       |

### What We DO NOT Use:
- Gradients on flat content cards or full-page backgrounds (gradients are reserved for the hero, primary CTAs, and stat-hero banners — see §5.4)
- Purple, pink, or teal-green combinations
- Dark mode (not in scope — adds complexity without business value)
- Drop shadows heavier than `shadow-sm` on cards

---

## 3. TYPOGRAPHY

### Font Family:
- **Primary:** `Inter` (already loaded via Next.js Google Fonts)
- **Monospace:** `font-mono` (system default) — used for Claim IDs, station IDs, code

### Type Scale:
| Element            | Size        | Weight    | Usage                          |
|--------------------|-------------|-----------|--------------------------------|
| Hero Headline      | 40–48px     | 800       | Landing page main title        |
| Page Title         | 28–32px     | 700       | Dashboard, Claims, etc.        |
| Section Header     | 18–20px     | 600       | Card titles, section names     |
| Body               | 14–15px     | 400       | Descriptions, paragraphs       |
| Label/Micro        | 10–12px     | 500–600   | Table headers, badges, tags    |
| Data Value (hero)  | 32–40px     | 700–800   | KPI numbers, verdict text      |
| Mono               | 12px        | 400       | Claim IDs, station IDs         |

### Typography Rules:
- **Never use more than 3 font sizes on one page.**
- **Never justify text.** Left-align always.
- **Number data is always right-aligned in tables.**
- **Labels are UPPERCASE with letter-spacing.** Data values are title case or exact.

---

## 4. LAYOUT SYSTEM

### Grid:
- **Sidebar:** Fixed 240px, always visible on desktop
- **Main content:** `flex-1`, scrollable, max-width varies by page
- **Cards:** 4-column on desktop, 2-column on tablet, 1-column mobile
- **Spacing unit:** 4px base (Tailwind default). Use multiples: 8, 16, 24, 32, 48px

### Page Structure (consistent across all pages):
```
┌──────────────────────────────────────────────────────┐
│ SIDEBAR (240px fixed)  │  MAIN CONTENT (flex-1)      │
│                        │  ┌────────────────────────┐ │
│  Logo                  │  │ Page Header (title)    │ │
│  ─────────────────     │  ├────────────────────────┤ │
│  OPERATIONS            │  │ Hero / KPI Row         │ │
│    Dashboard           │  ├────────────────────────┤ │
│    Adjudicate ←CTA     │  │ Main Content Area      │ │
│    Claims              │  │ (table / form / chart) │ │
│  INTELLIGENCE          │  └────────────────────────┘ │
│    Analytics           │                             │
│    Weather Q&A         │                             │
│  CRM                   │                             │
│    Customers           │                             │
│  TOOLS (collapsed)     │                             │
│    SLA Calc            │                             │
│    API Docs            │                             │
│    Policy              │                             │
│  ─────────────────     │                             │
│  System Status         │                             │
└──────────────────────────────────────────────────────┘
```

---

## 5. COMPONENT SPECIFICATIONS

### 5.1 SIDEBAR
- Background: `#1A3A5C` (navy)
- Logo area: Zap icon in `#0D6B8E` rounded square + "DREADNOUGHT" bold + "ASRE PLATFORM v2" small caps
- Nav groups: Collapsible sections with 10px uppercase labels in `text-blue-400`
- Active item: `#0D6B8E` background, white text, right chevron
- Hover: `white/10` overlay
- Status footer: Three green dots (ASRE Engine, Supabase, Groq LLM)
- Mobile: Hamburger button (top-left) → slide-in drawer with dark overlay

### 5.2 CARDS
- Background: White
- Border: `1px solid #E5E7EB` (gray-200)
- Border radius: `12px` (rounded-xl)
- Padding: `24px` (p-6)
- Shadow: `shadow-sm` only — NO heavy shadows
- Hover: `shadow-md` on interactive cards only

### 5.3 VERDICT BADGES (most critical component)
```
VALIDATED         ● green dot + "VALIDATED"      bg-green-100 text-green-800
REJECTED          ● red dot + label              bg-red-100 text-red-800
PENDING           ● amber dot + "Pending"        bg-amber-100 text-amber-800
INSUFFICIENT      ● gray dot + label             bg-gray-100 text-gray-700
```
- Shape: `rounded-full` pill, NOT rounded-sm box
- Font: `font-semibold text-xs`
- The dot: `w-1.5 h-1.5 rounded-full` inline before text

### 5.4 BUTTONS
**Primary (Navy gradient):**
- Background: `bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E]` → hover `from-[#0D6B8E] to-[#1E88BE]`
- NEVER flat `bg-[#1A3A5C]` alone — flat navy reads low-quality and lacks depth
- Text: White, `font-semibold`
- Padding: `px-4 py-2` or `px-6 py-3` (large)
- Border radius: `rounded-lg` (NOT rounded-full — that's for badges only)
- Icon: Left-side icon always (Zap, Plus, etc.)

**Secondary (Ghost):**
- Border: `1px solid #E5E7EB`
- Background: White → hover `#F9FAFB`
- Text: `text-gray-700`

**Danger:**
- Background: `#DC2626` → hover `#B91C1C`
- Use only for destructive actions (never for rejection verdicts)

**Disabled state:**
- `opacity-50` + `cursor-not-allowed`
- NEVER remove the button — always show disabled state with context

### 5.5 TABLES
- Header: `bg-gray-50`, `text-xs font-semibold text-gray-500 uppercase tracking-wide`
- Row: white background, `hover:bg-gray-50` on hover
- Row border: `divide-y divide-gray-100`
- Cell padding: `px-4 py-3`
- Truncation: Long text truncated with `max-w-[140px] truncate`
- Numbers: right-aligned (`text-right`)
- Empty state: Full-width cell with icon + message + CTA button

### 5.6 FORMS
- Label: `text-xs font-medium text-gray-600 mb-1` — ALWAYS above input
- Input: `border border-gray-300 rounded-lg px-3 py-2 text-sm`
- Focus: `ring-2 ring-[#1A3A5C]` (navy ring — not blue-500)
- Error: `border-red-300` + `text-red-600 text-xs mt-1`
- Required fields: `*` suffix on label — never hide required indicators

### 5.7 SKELETON LOADERS
- Use `animate-pulse` on gray rectangles matching content shape
- Height matches the real content height
- NEVER show "Loading..." text alone — always show skeleton
- Duration: If loading > 5 seconds, show an error state with retry button

---

## 6. PAGE-BY-PAGE DESIGN SPEC

### 6.1 DASHBOARD (Landing Page for logged-in users)

**Hero Section (top of page):**
```
┌─────────────────────────────────────────────────────────────────┐
│ [GRADIENT: #1A3A5C → #0D6B8E]                                   │
│                                                                   │
│  ● ASRE Engine Online — NOAA Rule 803(8) Certified              │
│                                                                   │
│  Force Majeure Adjudication                                       │
│  in under 500ms.                          [Submit a Claim →]    │
│                                           [Ask Weather Q&A]     │
│  AI-powered. Deterministic.                                       │
│  Zero human bias.                                                 │
│                                                                   │
│  ─────────────────────────────────────────────────────           │
│  7 claims    358ms avg    2 prevented    +21.8% vs baseline      │
└─────────────────────────────────────────────────────────────────┘
```

**Below Hero:**
- Row 1: 3 Trust Signal cards (NOAA, 4-Node Pipeline, 18 Stations)
- Row 2: 4 KPI Cards (Validated, Rejected, Avg Latency, Hallucinations Blocked)
- Row 3: 2 charts side by side (timeline line chart + label distribution bar)
- Row 4: System Architecture grid (8 tech specs)
- Row 5: 3 Quick Action cards (Submit Claim, Weather Q&A, SLA Calc)

**Design rules:**
- Hero gradient: the primary gradient surface; gradients are otherwise limited to CTAs and stat-hero banners — never on flat content cards or full-page backgrounds
- Live metrics in hero use real API data — NOT hardcoded
- Charts use skeleton loaders while fetching
- Quick Action cards have hover arrow animation (→)

---

### 6.2 ADJUDICATE PAGE

**Layout:** Two-column (form left, result right)

**Left Column — Form:**
- Clean white card, no distractions
- Fields in logical order: Who → What → Where → When → Why → How much
- Coordinate fields: side-by-side grid
- Date fields: native date picker (not custom)
- Submit button: Full width, navy, with Zap icon
- Helper text below coords: "Mumbai: 19.09, 72.85 | Surat: 21.20, 72.84"

**Right Column — Result:**
- **Empty state:** Centered Zap icon + "Ready for Adjudication" + sample coords
- **Loading state:** Animated pipeline (4 nodes, sequential)
  - Each node: numbered circle → turns green with checkmark when done
  - Active node: navy pulse animation + "running..." text
- **Result card:**
  - Full-width colored banner matching verdict (green/red/orange/purple)
  - Large verdict text + icon (CheckCircle / XCircle)
  - Processing time displayed prominently (top right of banner)
  - Legal Summary in white/60 rounded box
  - 6-cell metric grid (Station, Distance, Peak Wind, Exceedance, IDW Confidence, Node Path)
  - Action row: "Download Evidence Report" + "Calculate Settlement" (only on VALIDATED)
  - Claim ID in tiny mono at bottom

---

### 6.3 CLAIMS PAGE

**Header row:** Title + total count + "New Claim" button (navy, right-aligned)

**Summary pills row:**
```
[✓ 2 Validated]  [✗ 5 Rejected]  [◷ 0 Pending]
```

**Filter row:** Search input + status filter buttons

**Table:**
- VALIDATED rows: green `border-l-4 border-l-green-500` left border
- Verdict column: colored pill badge with dot
- Wind speed: green if ≥17.2, red if below
- Report column: `ExternalLink` icon + "Report" — opens PDF in new tab
- Empty state: FileText icon + message + "Submit a Claim →" button

---

### 6.4 ANALYTICS PAGE

**Top hero card:** Amber gradient, "HALLUCINATIONS PREVENTED" counter (large)

**Charts row:**
- Monthly Claim Volume: Bar chart (green=validated, red=rejected)
- Station Coverage Map: SVG India map with dots (18 stations)

**Benchmark table:** ASRE (1.000 F1) vs Baseline LLM (0.782 F1) — side by side

**System metrics row:** 4 cards (Total Claims, Approval Rate, Avg Processing, Total Customers)

**Label Distribution:** Grid of all verdict types with count and percentage

---

### 6.5 WEATHER Q&A PAGE

**Header:** "Weather Intelligence Query" + subtitle with station/year/cert info

**Example chips:** 4 clickable pills showing truncated example questions
- Style: `bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm`
- Hover: `bg-blue-100`

**Input row:** Full-width text input + "Ask" button (navy)
- Placeholder: "Ask a weather question..."
- Enter key submits

**Results:** Scrollable list (newest on top)
- Each result card: Question → Answer (big number if exact match) → metadata row
- Exact match: `text-2xl font-bold text-green-600` for the value
- No match: Amber box with explanation
- Source + confidence + processing time always visible

---

### 6.6 CUSTOMERS PAGE

**Standard list page:** Header + "Add Customer" button + search + filters + table

**Modal:** Clean overlay (dark background) → white card → form → Cancel/Create buttons
- Error state shown inside modal (red text, not toast)
- "Creating..." loading state on button

---

### 6.7 POLICY PAGE

**Four threshold cards:** Wind / Radius / Exceedance / IDW Power
- Each card: Icon (top right, colored) + number (large) + unit (small)
- Info box below: Blue-tinted explanation of deterministic enforcement

**Station Registry:** Full table, 18 rows, ID/Name/State/Lat/Lon/Radius

**Audit Log:** Paginated table, event type badges (blue/green/amber/red)

---

### 6.8 SLA CALCULATOR PAGE

**Two-column layout:**
- Left: Input form (capacity, tariff, PLF, coverage, dates, deductible)
- Right: Results appear after calculation (not a separate page)

**Results:**
- 3 hero metrics: FM Days / Gross Revenue Loss (red) / Recommended Settlement (green)
- Breakdown list: Bullet-style calculation steps
- Disclaimer: Amber box at bottom

---

### 6.9 API DOCS PAGE

**Minimal reference page:**
- Base URL box (dark background, monospace)
- Auth notice (amber box)
- Threshold reference grid
- Endpoint cards: Method badge + path + description + request/response panels side by side

---

## 7. ANIMATION & INTERACTION PRINCIPLES

### What we animate:
- **Sidebar nav items:** `transition-all duration-150` on hover
- **Cards with hover:** `transition-shadow duration-200`
- **Skeleton loaders:** `animate-pulse` (built-in Tailwind)
- **Pipeline nodes:** Sequential activation with `transition-all duration-300`
- **Buttons:** `transition-colors duration-150` on hover/active
- **Modal:** Appears instantly (no slide animation — feels faster)

### What we DO NOT animate:
- Page transitions (no slide-in, fade-in between pages)
- Data loading (no spinners — skeleton loaders only)
- Micro-animations on every element (exhausting to look at)
- Confetti or celebration animations (this is legal software)

---

## 8. WHAT WE DELIBERATELY AVOID

| Avoided Element            | Reason                                                    |
|----------------------------|-----------------------------------------------------------|
| Full-page gradients        | Feels like a SaaS startup, not a legal platform           |
| Rounded-full buttons       | Too playful for enterprise context                        |
| Heavy drop shadows         | Makes it look like a 2015 Bootstrap site                  |
| Animated page transitions  | Slows down perceived speed                                |
| Toast notifications        | Errors shown inline — user should see them in context     |
| Lottie / GIF animations    | Adds weight, reduces professionalism                      |
| Dark mode                  | Out of scope — doubles design complexity                  |
| Hero image / stock photos  | No photos. Data is the visual.                            |
| Emoji in UI                | No emoji except ✅ / ❌ in verdict displays               |
| Infinite scroll            | Pagination is deliberate — shows control and precision    |
| Auto-refresh / live data   | Manual refresh only — user controls when data updates     |

---

## 9. RESPONSIVE BREAKPOINTS

| Breakpoint | Width     | Layout Change                                        |
|------------|-----------|------------------------------------------------------|
| Mobile     | < 768px   | Sidebar hidden → hamburger menu drawer               |
| Tablet     | 768–1024px| Sidebar visible, grids collapse to 2-column          |
| Desktop    | > 1024px  | Full layout, 4-column grids, side-by-side panels     |

---

## 10. ACCESSIBILITY STANDARDS

- All interactive elements: `focus:ring-2 focus:ring-[#1A3A5C] focus:outline-none`
- Color never sole indicator of state (badges always have text + dot)
- All form inputs have associated `<label>` elements
- Tables have proper `<th scope="col">` headers
- Images/icons: Either purely decorative (aria-hidden) or have accessible titles
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text

---

## 11. IMPLEMENTATION PRIORITY

### Phase 1 — Foundation (COMPLETE ✅)
- Color system and typography established
- Sidebar with grouping and mobile support
- All pages loading with real data
- Skeleton loaders on all async content

### Phase 2 — Polish (NEXT)
1. Hero section enhancement — add animated counter to live metrics
2. Adjudication pipeline animation — improve timing and feedback
3. Verdict card — make the VALIDATED state feel celebratory (but controlled)
4. Claims table — add row click to expand claim detail inline
5. Mobile layout audit — test all pages on 375px width

### Phase 3 — Delight (FUTURE)
1. Keyboard shortcuts (press 'A' to adjudicate, 'C' for claims)
2. Dark mode (if requested by clients)
3. PDF report styling — make it pixel-perfect for printing
4. Export buttons (CSV download for claims, analytics)
5. Real-time claim counter (WebSocket — only if funded)

---

## 12. DESIGN DECISIONS LOG

| Decision | Reason | Alternative Considered |
|----------|--------|----------------------|
| Navy `#1A3A5C` as primary | Legal/maritime authority | Dark charcoal #1F2937 |
| No page transitions | Speed perception > aesthetics | Framer Motion fade |
| Skeleton loaders everywhere | Consistent, fast-feeling | Spinners |
| Pagination over infinite scroll | User control, legal precision | React Query infinite |
| Inline errors over toasts | Context-aware, can't be missed | React Hot Toast |
| Pills for verdict badges | Clear, scannable, colorblind-safe | Icon-only |
| Gradient CTAs (navy→teal, hover→#1E88BE) | Flat navy read low-quality; subtle depth signals premium | Flat `bg-[#1A3A5C]` buttons (deprecated) |
| `Inter` as the single type family | Consistency with shipped Next.js app | `DM Sans` (mockup-only drift, removed) |
| No stock photos | Data is the hero | Abstract hero images |

---

*Document ends. Every implementation decision traces back to Section 1: Make the data feel like authority.*

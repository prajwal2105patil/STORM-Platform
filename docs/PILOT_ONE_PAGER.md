# DREADNOUGHT ASRE — Design-Partner Pilot (One-Pager)

**What it is.** A deterministic adjudication engine for **wind-peril** force-majeure
claims. You give it an asset location and a claim window; it returns a VALIDATED / REJECTED
verdict grounded in the public NOAA ISD weather record — with the station, distance, peak
wind, and exceedance hours attached as evidence. The language model only *parses* the claim;
**the NOAA data decides the verdict**, so it cannot hallucinate an outcome.

**Why it's different.** Most "AI claim" tools ask a model to judge. ASRE uses the model as a
translator and a deterministic, inspectable rule set as the judge. Same input → same verdict,
every time, with a citable evidence trail. It is built to be cross-examined, not trusted.

---

## What we can prove today (honestly)

Validated against **12 documented IMD/JTWC cyclones (2016–2023)** and 6 calm-period controls,
replayed on the real NOAA record (`benchmarks/HISTORICAL_VALIDATION.md`):

| Property | Result | What it means for you |
|---|---|---|
| **Specificity** | 6/6 controls rejected, **0 false positives** | It will not validate a non-event — no wrongful payouts from the engine |
| **Recall (current settings)** | 1/12 cyclones validated | Conservative: only validates when the hourly-mean record is unambiguous |
| **Recall (tunable)** | up to 7/12 (58%) with a standard gust factor, still 0 false positives | Measured headroom — recall is a dial, set by policy, not a limitation |
| **Latency** | < 500 ms per claim | Real-time triage at intake |
| **Determinism** | identical inputs → identical verdict | Auditable, reproducible, defensible |

**We are not hiding the recall number.** ASRE is a high-precision instrument: it is most
valuable as a **first-pass filter that conclusively clears the unambiguous cases and flags the
rest for a human**, not as a fully-automatic approver. That is the correct posture for evidence
that may reach a tribunal.

**Scope today:** sustained surface-wind perils (gale ≥ 17.2 m/s). Not flood, surge, hail, or
tornado — those need different sensor networks and are on the roadmap, not in the claim.

---

## The pilot offer

**Free, time-boxed (4–6 weeks). No data leaves your control we don't agree on.**

**You provide:** 20–50 historical wind-peril claims you've already adjudicated (asset
lat/lon, claim window, and your final outcome). De-identified is fine.

**We deliver:**
1. ASRE's verdict on each, with full evidence packet.
2. A confusion matrix vs your real outcomes — agreements, disagreements, and *why* for each.
3. A calibrated recommendation on threshold settings tuned to **your** claim book.
4. A go/no-go readout: where ASRE saves you review time today, and where it can't yet.

**Success criterion (agreed up front):** on the cases ASRE validates, it agrees with your
adjudicators at a rate you define as useful — typically ≥ X% — with a false-positive rate at
or near zero.

**What we ask in return:** a reference conversation if it works, and permission to cite the
(anonymized) result.

---

## Why now
You carry wind-peril force-majeure exposure. Today those claims are adjudicated manually
against scattered weather sources with no reproducible evidence trail. ASRE turns that into a
sub-second, cited, deterministic verdict — and we'll prove it on *your* claims before you
commit to anything.

*Contact: [founder] · DREADNOUGHT ASRE · Built on NOAA ISD public records.*

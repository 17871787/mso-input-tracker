# MSO Input Price Tracker — Implementation Plan

Features sourced from GEL (Grassland Economics Lab) analysis + PRD open questions.
Ordered by value-to-effort ratio. Each phase is independently shippable.

---

## Phase 1 — Shock Testing Panel
**Value:** Highest. Answers "what happens to my signals if prices move?"
**Effort:** Low. Engine exists; just mutate price inputs and re-run.

### What to build
- `ShockPanel.tsx` component below the signal grid
- Pre-defined shock scenarios:
  - **Output price -15%** (lamb/cattle/milk/wheat drop)
  - **Input costs +25%** (all tracked inputs)
  - **Fertiliser spike** (AN/urea +50%, echo of 2022)
  - **Feed squeeze** (wheat/barley/soya +30%)
  - **Two-hit** (inputs +25% AND output -10%)
- Each scenario: re-run `calculateWeeklySignals()` with mutated `priceData`, display side-by-side RAG comparison vs baseline
- Table format from GEL: scenario | input | baseline RAG | shocked RAG | ratio shift | verdict

### Engine changes
- New export: `applyPriceShock(prices: PriceSeries[], shocks: Record<string, number>): PriceSeries[]`
  - Takes a multiplier per price series ID (e.g. `{ an_fertiliser: 1.25, cattle_dw: 0.85 }`)
  - Returns new `PriceSeries[]` with current week's price mutated
- No changes to `calculateWeeklySignals` — it already accepts arbitrary price data

### UI
- Collapsible panel, closed by default: "Stress Test — What If?"
- Click a scenario button → table populates with baseline vs shocked signals
- Colour-code cells where RAG changes (green→red = highlighted)
- Show which signals survive all shocks (= robust purchasing decisions)

---

## Phase 2 — Break-Even Ratio + Dual Signal Display
**Value:** High. Answers two different questions that the current UI conflates.
**Effort:** Low. Data already computed, just needs display.

### Problem
Current tracker shows ONE signal per input (percentile-based RAG). But there are two questions:
1. **Absolute:** Is this input paying for itself right now? (ratio vs 1.0)
2. **Relative:** Is this input historically cheap? (percentile vs 3-year window)

A green percentile signal on a ratio of 1.4 means "this is the cheapest it's been, but it's still not paying for itself." That's not a buy signal — it's a "less bad" signal.

### What to build
- Add `breakEvenRatio` to `WeeklySignal` type — the ratio at which input cost = output value (always 1.0 for unit-normalised ratios, but display it)
- Add `absoluteVerdict` field: "Profitable" (ratio < 1.0), "Marginal" (1.0–1.2), "Uneconomic" (> 1.2)
- Signal card shows both:
  - RAG badge (percentile) — top right as now
  - Small inline badge for absolute verdict — below ratio value
- If percentile = green but absolute = uneconomic, show warning: "Historically cheap but still above break-even"

### Conversion factor audit
- Review all 15 `conversionFactor` values in farm-profiles.ts
- Ensure they produce ratios where 1.0 = genuine break-even
- Currently some factors are arbitrary scaling — need to calibrate so the absolute signal is meaningful
- Add `breakEvenNote` to `FarmInputMapping` explaining what ratio = 1.0 means for this pair

---

## Phase 3 — Conversion Factor Sensitivity
**Value:** High. Exposes fragile signals.
**Effort:** Medium. New component + engine helper.

### Problem
Conversion factors are AHDB benchmarks. Real farms vary. A signal that flips from green to red with a 10% change in FCR is not a confident signal.

### What to build
- `SensitivityGauge.tsx` — small bar or range indicator on each signal card
- Engine helper: `sensitivityTest(farm, mapping, prices, weekStart, range = 0.2)`
  - Runs ratio calc at conversion factor × 0.8, × 0.9, × 1.0, × 1.1, × 1.2
  - Returns: does the RAG signal change across that range?
  - Output: `{ stable: boolean, rangeOfSignals: RAGSignal[], sensitivity: "low" | "medium" | "high" }`
- Display on signal card: small icon (solid dot = stable, warning triangle = sensitive)
- In detail view: full sensitivity sweep chart — ratio vs conversion factor, with RAG bands

### Teaching value
- Forces the user to ask: "Do I trust this conversion factor for MY farm?"
- If sensitivity is high, the signal is only useful if you know your actual FCR/response rate

---

## Phase 4 — Week Navigator (Time Travel)
**Value:** High. Currently hardcoded to one week.
**Effort:** Low. Just a state variable + date picker.

### What to build
- Replace `CURRENT_WEEK` constant with `useState`
- Add week selector in header: `< Prev Week` | date display | `Next Week >`
- All signals, summary, charts re-compute for selected week
- Show 52-week mini-timeline below header with dots coloured by dominant signal that week
- Enables: "Last October hay was green — I should have bought then" retrospective analysis

### Constraints
- Don't allow navigation beyond price data range (week 1 to week 156)
- Historical chart should highlight the selected week with a vertical line

---

## Phase 5 — Cross-Farm Comparison View
**Value:** Medium-high. PRD open question #5. Key for advisers.
**Effort:** Medium. New page/tab.

### What to build
- New view: "Adviser View" or "Cross-Farm" tab
- Matrix layout: rows = inputs, columns = farms
- Each cell: RAG badge + ratio for that input on that farm
- Only shows inputs that appear on multiple farms (AN fertiliser appears on all 4; hay on 2; soya only on dairy)
- Plain English summary: "AN is green for arable N this week but red for dairy supplementation"

### Why it matters
- Same input at the same price has different rationality on different farm types
- AN at £300/t might be green for Bridgefoot (wheat response) but red for Thornside (minimal grass response)
- Advisers managing mixed portfolios need this view

---

## Phase 6 — Signal Stability Score
**Value:** Medium. Adds confidence to signals.
**Effort:** Low. Derived from existing historical data.

### What to build
- For each input/farm, compute: how many consecutive weeks has the current RAG signal held?
- `stabilityWeeks: number` added to `WeeklySignal`
- Display as "Green for 8 weeks" or "Just turned red" on signal card
- Newly-turned signals get a subtle "NEW" indicator
- A signal that's been green for 12 weeks is stronger than one that just flipped

### Engine
- `getSignalStability(farm, mapping, prices, weekStart, windowWeeks)`: count consecutive weeks with same RAG going backwards from current week

### Additional: trend direction
- Is the percentile rising or falling? (moving towards red or towards green?)
- Small up/down arrow on signal card

---

## Phase 7 — Robustness Profile (Taleb View)
**Value:** Medium. Farm-level risk overlay.
**Effort:** Medium. New data model + component.

### What to build
Adapted from GEL's `computeRobustness()`. A farm-level composite score that contextualises the weekly signals.

- `RobustnessProfile` type:
  ```
  inputDependence: number    // 0-100: how much of the farm's cost base is tracked inputs
  priceVolatility: number    // 0-100: recent volatility of the farm's key output
  seasonalExposure: number   // 0-100: what % of the year is the farm in feed gap
  conversionConfidence: number // 0-100: how stable are signals across sensitivity range
  shockSurvival: number      // 0-100: how many shock scenarios keep all signals ≤ amber
  ```
- Composite score 0-100: displayed as a ring/gauge in farm info card
- Fragility flags (from GEL): "High input dependence", "Volatile output market", "Long feed gap"

### Difference from GEL
- GEL asks the user to input risk params (debt ratio, policy exposure, etc.)
- MSO tracker computes it from the data it already has (price history, signal stability, shock test results)
- No extra user input required — it's derived

---

## Phase 8 — Substitution Credit (Dairy Model Fix)
**Value:** Medium. Corrects a modelling error.
**Effort:** Low-medium. Engine change + type extension.

### Problem
Moorgate dairy's concentrate ratio treats soya/wheat cost as the full input cost. But concentrates substitute forage — the displaced grass has value. GEL models this as `substitution_DM_per_kg × pasture_DM_price_per_t`.

### What to build
- Add optional fields to `FarmInputMapping`:
  ```
  substitutionFactor?: number     // kg forage DM displaced per unit input
  substitutionValuePerUnit?: number  // £ value of displaced forage per unit
  ```
- Modify `calculateRatio()`:
  ```
  netInputCost = inputPrice - (substitutionFactor * substitutionValuePerUnit)
  ratio = (netInputCost * conversionFactor) / outputPrice
  ```
- Only applies to dairy concentrate mappings (soya, wheat, rapemeal)
- Display "Net cost after forage credit" in signal card

### Calibration
- Pasture DM value: ~£160/t DM (GEL default, reasonable for grazed grass)
- Substitution rate: ~0.6 kg DM per kg concentrate eaten (GEL default from literature)
- This will make dairy concentrate signals slightly more favourable (correctly)

---

## Phase 9 — Diagnostics Page
**Value:** Low (internal). Important for credibility.
**Effort:** Low. Inspired by GEL's TestPanel.

### What to build
- `/diagnostics` route (not linked from main nav, accessed by URL)
- Runs engine sanity checks in the browser:
  - Diminishing returns: margin at 30 N > margin at 60 N (for all farms with AN)
  - VMP rises with output price (increase meat/milk price → VMP should increase)
  - Season gates: out-of-season inputs return grey
  - Shock consistency: inputs +25% should raise ratios for all mappings
  - Break-even direction: higher input price → higher ratio → worse signal
  - Percentile bounds: 0-100, no NaN
  - Historical data completeness: all 156 weeks present for all series
- Display as pass/fail list with details (GEL pattern)

---

## Phase 10 — Improved Price Data
**Value:** Medium. Makes the demo more convincing.
**Effort:** Medium. Better generator or real data.

### Option A: Better synthetic data
- Add mean reversion to the random walk (prices pull back to long-run average)
- Add cross-correlation: wheat and barley prices should move together; AN and urea should correlate
- Add proper 2022 fertiliser spike shape (sharp up, slow down) rather than symmetric triangle
- Add harvest-year structure to grain prices (drop at harvest, climb through winter)

### Option B: Real AHDB data (MVP+)
- Download AHDB published weekly price CSVs (free, no API needed)
- Parse into `PriceSeries[]` format
- Covers AN, urea, feed wheat, feed barley, cattle DW, lamb DW, milk — all published weekly
- Hay/straw: Farmers Weekly regional surveys (manual entry, monthly not weekly)
- This is the real unlock — switches from "illustrative" to "this is your actual market"

---

## Execution order

| Phase | Feature | Effort | Ships independently | Depends on |
|-------|---------|--------|--------------------|-|
| 1 | Shock testing | 2-3 hrs | Yes | — |
| 2 | Break-even + dual signal | 2 hrs | Yes | — |
| 3 | Sensitivity gauge | 3 hrs | Yes | — |
| 4 | Week navigator | 1-2 hrs | Yes | — |
| 5 | Cross-farm view | 3-4 hrs | Yes | — |
| 6 | Signal stability | 1-2 hrs | Yes | — |
| 7 | Robustness profile | 4-5 hrs | Yes | 1, 3 (uses shock + sensitivity data) |
| 8 | Substitution credit | 2 hrs | Yes | — |
| 9 | Diagnostics | 2 hrs | Yes | — |
| 10 | Real price data | 4-6 hrs | Yes | — |

Phases 1-6 have no dependencies and can be built in any order.
Phase 7 is best done after 1 and 3 (it uses their outputs).
Phase 10 can be done at any time but transforms the product from demo to real.

**Recommended first session:** Phases 1, 2, 4, 6 (all low effort, high value, no dependencies). Gets shock testing, dual signals, time travel, and stability scores into the dashboard in one push.

"use client";

import { useMemo } from "react";
import { farmProfiles } from "@/app/data/farm-profiles";
import { priceData } from "@/app/data/generate-prices";
import { inputs } from "@/app/data/inputs-outputs";
import {
  calculateWeeklySignals,
  getAvailableWeeks,
  sensitivityTest,
  applyPriceShock,
  getHistoricalRatios,
} from "@/app/lib/ratio-engine";

interface TestResult {
  name: string;
  pass: boolean;
  details: string;
  category: string;
}

function runAllTests(): TestResult[] {
  const tests: TestResult[] = [];
  const weeks = getAvailableWeeks(priceData);
  const latestWeek = weeks[weeks.length - 1];

  // ── Data completeness ──

  tests.push({
    name: "156 weeks of price data",
    pass: weeks.length === 156,
    details: `Got ${weeks.length} weeks`,
    category: "Data",
  });

  for (const series of priceData) {
    tests.push({
      name: `${series.id}: no NaN or zero prices`,
      pass: series.prices.every((p) => Number.isFinite(p.price) && p.price > 0),
      details: `${series.prices.length} points, min=${Math.min(...series.prices.map((p) => p.price)).toFixed(2)}, max=${Math.max(...series.prices.map((p) => p.price)).toFixed(2)}`,
      category: "Data",
    });
  }

  // ── Signal logic ──

  for (const farm of farmProfiles) {
    const signals = calculateWeeklySignals(farm, priceData, latestWeek);

    // Percentiles must be 0-100
    tests.push({
      name: `${farm.name}: percentiles in 0-100 range`,
      pass: signals.every((s) => s.percentileRank >= 0 && s.percentileRank <= 100),
      details: signals.map((s) => `${s.inputId}=${s.percentileRank}`).join(", "),
      category: "Signals",
    });

    // Grey signals must be out of season
    const greys = signals.filter((s) => s.ragSignal === "grey");
    tests.push({
      name: `${farm.name}: grey signals are out of season`,
      pass: greys.every((s) => !s.inSeasonGate),
      details: `${greys.length} grey signals`,
      category: "Signals",
    });

    // In-season signals must not be grey
    const inSeason = signals.filter((s) => s.inSeasonGate);
    tests.push({
      name: `${farm.name}: in-season signals have RAG colour`,
      pass: inSeason.every((s) => s.ragSignal !== "grey"),
      details: `${inSeason.length} in-season signals`,
      category: "Signals",
    });

    // Ratio values must be positive
    const activeSignals = signals.filter((s) => s.currentInputPrice > 0 && s.currentOutputPrice > 0);
    tests.push({
      name: `${farm.name}: ratios are positive`,
      pass: activeSignals.every((s) => s.ratioValue > 0),
      details: activeSignals.map((s) => `${s.inputId}=${s.ratioValue.toFixed(3)}`).join(", "),
      category: "Signals",
    });
  }

  // ── Economic logic ──

  // Higher input price → higher ratio (worse signal)
  for (const farm of farmProfiles) {
    for (const mapping of farm.inputMappings) {
      const baseSignals = calculateWeeklySignals(farm, priceData, latestWeek);
      const shockedPrices = applyPriceShock(priceData, { [mapping.inputId]: 1.5 }, latestWeek);
      const shockedSignals = calculateWeeklySignals(farm, shockedPrices, latestWeek);

      const base = baseSignals.find((s) => s.inputId === mapping.inputId);
      const shocked = shockedSignals.find((s) => s.inputId === mapping.inputId);

      if (base && shocked && base.currentInputPrice > 0) {
        tests.push({
          name: `${farm.name}/${inputs.find((i) => i.id === mapping.inputId)?.name}: input +50% raises ratio`,
          pass: shocked.ratioValue >= base.ratioValue,
          details: `base=${base.ratioValue.toFixed(3)}, shocked=${shocked.ratioValue.toFixed(3)}`,
          category: "Economics",
        });
      }
    }
  }

  // Higher output price → lower ratio (better signal)
  for (const farm of farmProfiles) {
    for (const mapping of farm.inputMappings) {
      const baseSignals = calculateWeeklySignals(farm, priceData, latestWeek);
      const shockedPrices = applyPriceShock(priceData, { [mapping.outputId]: 1.5 }, latestWeek);
      const shockedSignals = calculateWeeklySignals(farm, shockedPrices, latestWeek);

      const base = baseSignals.find((s) => s.inputId === mapping.inputId);
      const shocked = shockedSignals.find((s) => s.inputId === mapping.inputId);

      if (base && shocked && base.currentOutputPrice > 0) {
        tests.push({
          name: `${farm.name}/${inputs.find((i) => i.id === mapping.inputId)?.name}: output +50% lowers ratio`,
          pass: shocked.ratioValue <= base.ratioValue,
          details: `base=${base.ratioValue.toFixed(3)}, shocked=${shocked.ratioValue.toFixed(3)}`,
          category: "Economics",
        });
      }
    }
  }

  // ── Shock consistency ──

  // Inputs +25% should raise ratios for all input mappings
  for (const farm of farmProfiles) {
    const baseSignals = calculateWeeklySignals(farm, priceData, latestWeek);
    const allInputShocks: Record<string, number> = {};
    for (const input of inputs) allInputShocks[input.id] = 1.25;
    const shockedPrices = applyPriceShock(priceData, allInputShocks, latestWeek);
    const shockedSignals = calculateWeeklySignals(farm, shockedPrices, latestWeek);

    for (const mapping of farm.inputMappings) {
      const base = baseSignals.find((s) => s.inputId === mapping.inputId);
      const shocked = shockedSignals.find((s) => s.inputId === mapping.inputId);
      if (base && shocked && base.currentInputPrice > 0) {
        tests.push({
          name: `${farm.name}/${inputs.find((i) => i.id === mapping.inputId)?.name}: all-inputs +25% raises ratio`,
          pass: shocked.ratioValue >= base.ratioValue,
          details: `base=${base.ratioValue.toFixed(3)}, shocked=${shocked.ratioValue.toFixed(3)}`,
          category: "Shocks",
        });
      }
    }
  }

  // ── Sensitivity ──

  for (const farm of farmProfiles) {
    for (const mapping of farm.inputMappings) {
      const result = sensitivityTest(farm, mapping, priceData, latestWeek);

      // Sweep results should have 5 entries
      tests.push({
        name: `${farm.name}/${inputs.find((i) => i.id === mapping.inputId)?.name}: sensitivity sweep has 5 points`,
        pass: result.sweepResults.length === 5,
        details: `Got ${result.sweepResults.length} points`,
        category: "Sensitivity",
      });

      // Higher conversion factor should produce higher ratio (monotonic)
      const ratios = result.sweepResults.map((r) => r.ratio);
      const isMonotonic = ratios.every((r, i) => i === 0 || r >= ratios[i - 1]);
      tests.push({
        name: `${farm.name}/${inputs.find((i) => i.id === mapping.inputId)?.name}: ratio increases with conversion factor`,
        pass: isMonotonic,
        details: ratios.map((r) => r.toFixed(3)).join(" → "),
        category: "Sensitivity",
      });
    }
  }

  // ── Historical ──

  // Check diminishing returns: for any farm with AN, ratio at week 100 should use valid percentiles
  for (const farm of farmProfiles) {
    const anMapping = farm.inputMappings.find((m) => m.inputId === "an_fertiliser");
    if (!anMapping) continue;

    const history = getHistoricalRatios(farm, anMapping, priceData);
    tests.push({
      name: `${farm.name}/AN: historical ratio series is complete`,
      pass: history.length >= 150,
      details: `${history.length} data points`,
      category: "Historical",
    });

    // No NaN percentiles
    tests.push({
      name: `${farm.name}/AN: no NaN percentiles in history`,
      pass: history.every((h) => Number.isFinite(h.percentile)),
      details: `${history.filter((h) => !Number.isFinite(h.percentile)).length} NaN values`,
      category: "Historical",
    });
  }

  // ── Substitution credit (dairy) ──

  const moorgate = farmProfiles.find((f) => f.id === "moorgate")!;
  const wheatMapping = moorgate.inputMappings.find((m) => m.inputId === "feed_wheat")!;

  // Substitution should lower the ratio compared to without it
  const moorgateSignals = calculateWeeklySignals(moorgate, priceData, latestWeek);
  const wheatSignal = moorgateSignals.find((s) => s.inputId === "feed_wheat");

  // Build a no-substitution version
  const noSubMapping = { ...wheatMapping, substitutionFactor: undefined, substitutionValuePerUnit: undefined };
  const noSubFarm = {
    ...moorgate,
    inputMappings: moorgate.inputMappings.map((m) =>
      m.inputId === "feed_wheat" ? noSubMapping : m
    ),
  };
  const noSubSignals = calculateWeeklySignals(noSubFarm, priceData, latestWeek);
  const noSubWheat = noSubSignals.find((s) => s.inputId === "feed_wheat");

  if (wheatSignal && noSubWheat) {
    tests.push({
      name: "Moorgate/Feed Wheat: substitution credit lowers ratio",
      pass: wheatSignal.ratioValue <= noSubWheat.ratioValue,
      details: `with credit=${wheatSignal.ratioValue.toFixed(3)}, without=${noSubWheat.ratioValue.toFixed(3)}`,
      category: "Substitution",
    });
  }

  return tests;
}

export default function DiagnosticsPage() {
  const results = useMemo(() => runAllTests(), []);

  const categories = [...new Set(results.map((r) => r.category))];
  const allPass = results.every((r) => r.pass);
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">MSO Tracker — Diagnostics</h1>
          <p className="text-sm text-[#78716c] mt-1">
            Engine sanity checks. {passCount} passed, {failCount} failed, {results.length} total.
          </p>
          <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            allPass ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fee2e2] text-[#dc2626]"
          }`}>
            {allPass ? "All tests passing" : `${failCount} test${failCount > 1 ? "s" : ""} failing`}
          </div>
        </header>

        {categories.map((category) => {
          const catResults = results.filter((r) => r.category === category);
          const catPass = catResults.every((r) => r.pass);

          return (
            <div key={category} className="mb-6">
              <h2 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${catPass ? "bg-[#16a34a]" : "bg-[#dc2626]"}`} />
                {category}
                <span className="text-[#78716c] font-normal">
                  ({catResults.filter((r) => r.pass).length}/{catResults.length})
                </span>
              </h2>
              <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
                {catResults.map((test, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 px-4 py-2 text-sm ${
                      i > 0 ? "border-t border-[#e7e5e4]" : ""
                    } ${!test.pass ? "bg-[#fee2e2]/30" : ""}`}
                  >
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      test.pass ? "bg-[#16a34a]" : "bg-[#dc2626]"
                    }`} />
                    <div className="min-w-0">
                      <span className="font-medium">{test.name}</span>
                      <span className="text-[#78716c] ml-2 text-xs">{test.details}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <footer className="mt-8 text-center text-xs text-[#78716c]">
          <a href="/" className="hover:underline">← Back to dashboard</a>
          {" · "}MSO Input Price Tracker Diagnostics
        </footer>
      </div>
    </div>
  );
}

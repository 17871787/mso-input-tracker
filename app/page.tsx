"use client";

import { useMemo, useState } from "react";
import { farmProfiles } from "@/app/data/farm-profiles";
import { priceData } from "@/app/data/generate-prices";
import { inputs, outputs } from "@/app/data/inputs-outputs";
import {
  calculateWeeklySignals,
  generateFarmSummary,
  getHistoricalRatios,
  getAvailableWeeks,
  sensitivityTest,
  computeRobustness,
} from "@/app/lib/ratio-engine";
import { WeeklySignal, SensitivityResult } from "@/app/lib/types";
import { SignalCard } from "@/app/components/SignalCard";
import { HistoricalChart } from "@/app/components/HistoricalChart";
import { SeasonStrip } from "@/app/components/SeasonStrip";
import { RAGBadge } from "@/app/components/RAGBadge";
import { AbsoluteBadge } from "@/app/components/AbsoluteBadge";
import { StabilityIndicator } from "@/app/components/StabilityIndicator";
import { WeekNavigator } from "@/app/components/WeekNavigator";
import { ShockPanel } from "@/app/components/ShockPanel";
import { SensitivityGauge } from "@/app/components/SensitivityGauge";
import { CrossFarmView } from "@/app/components/CrossFarmView";
import { RobustnessProfile } from "@/app/components/RobustnessProfile";

const availableWeeks = getAvailableWeeks(priceData);
const LATEST_WEEK = availableWeeks[availableWeeks.length - 1];

type ViewMode = "farm" | "crossfarm";

export default function Dashboard() {
  const [activeFarmId, setActiveFarmId] = useState(farmProfiles[0].id);
  const [selectedSignal, setSelectedSignal] = useState<WeeklySignal | null>(null);
  const [currentWeek, setCurrentWeek] = useState(LATEST_WEEK);
  const [viewMode, setViewMode] = useState<ViewMode>("farm");

  const activeFarm = farmProfiles.find((f) => f.id === activeFarmId)!;
  const currentMonth = new Date(currentWeek).getMonth() + 1;

  const signals = useMemo(
    () => calculateWeeklySignals(activeFarm, priceData, currentWeek),
    [activeFarm, currentWeek]
  );

  const summary = useMemo(
    () => generateFarmSummary(activeFarm, signals),
    [activeFarm, signals]
  );

  // Sensitivity for all mappings on active farm
  const sensitivities = useMemo(
    () =>
      activeFarm.inputMappings.map((mapping) =>
        sensitivityTest(activeFarm, mapping, priceData, currentWeek)
      ),
    [activeFarm, currentWeek]
  );

  // Robustness score
  const robustness = useMemo(
    () => computeRobustness(activeFarm, priceData, currentWeek, signals, sensitivities),
    [activeFarm, currentWeek, signals, sensitivities]
  );

  // Selected signal detail data
  const selectedMapping = selectedSignal
    ? activeFarm.inputMappings.find((m) => m.inputId === selectedSignal.inputId)
    : null;

  const historicalData = useMemo(() => {
    if (!selectedMapping) return [];
    return getHistoricalRatios(activeFarm, selectedMapping, priceData);
  }, [activeFarm, selectedMapping]);

  const selectedSensitivity = selectedSignal
    ? sensitivities.find((s) => s.inputId === selectedSignal.inputId) ?? null
    : null;

  const selectedInputName = selectedSignal
    ? inputs.find((i) => i.id === selectedSignal.inputId)?.name ?? ""
    : "";

  const selectedOutputName = selectedSignal
    ? outputs.find((o) => o.id === selectedSignal.outputId)?.name ?? ""
    : "";

  const greenCount = signals.filter((s) => s.ragSignal === "green").length;
  const amberCount = signals.filter((s) => s.ragSignal === "amber").length;
  const redCount = signals.filter((s) => s.ragSignal === "red").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">MSO Input Price Tracker</h1>
              <p className="text-xs text-muted mt-0.5">
                Weekly buy-zone signals · Clark &amp; Scanlon MSO framework
              </p>
            </div>
            <div className="flex items-center gap-6">
              <WeekNavigator
                weeks={availableWeeks}
                currentWeek={currentWeek}
                onChange={(w) => {
                  setCurrentWeek(w);
                  setSelectedSignal(null);
                }}
              />
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-signal" />
                  <span>{greenCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-signal" />
                  <span>{amberCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-signal" />
                  <span>{redCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* View mode toggle + Farm selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          {/* View toggle */}
          <div className="flex bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => { setViewMode("farm"); setSelectedSignal(null); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "farm"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Farm View
            </button>
            <button
              onClick={() => { setViewMode("crossfarm"); setSelectedSignal(null); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "crossfarm"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Cross-Farm
            </button>
          </div>

          {/* Farm tabs (only in farm view) */}
          {viewMode === "farm" && (
            <div className="flex gap-2 overflow-x-auto">
              {farmProfiles.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => {
                    setActiveFarmId(farm.id);
                    setSelectedSignal(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    farm.id === activeFarmId
                      ? "bg-foreground text-background"
                      : "bg-card border border-border text-muted hover:text-foreground"
                  }`}
                >
                  {farm.name}
                  <span className="ml-1.5 text-xs opacity-70">{farm.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cross-farm view */}
        {viewMode === "crossfarm" && (
          <div className="space-y-6">
            <CrossFarmView
              farms={farmProfiles}
              prices={priceData}
              weekStart={currentWeek}
            />
          </div>
        )}

        {/* Farm view */}
        {viewMode === "farm" && (
          <>
            {/* Farm info + Robustness */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <h2 className="font-bold text-lg">{activeFarm.name}</h2>
                    <p className="text-sm text-muted">
                      {activeFarm.location} · {activeFarm.size} · {activeFarm.type}
                    </p>
                    <p className="text-sm mt-1">{activeFarm.enterprise}</p>
                  </div>
                  <div className="sm:max-w-xs">
                    <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-1">
                      MSO Context
                    </p>
                    <p className="text-xs text-muted">{activeFarm.msoContext}</p>
                  </div>
                </div>
              </div>
              <RobustnessProfile score={robustness} farmName={activeFarm.name} />
            </div>

            {/* Summary sentence */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <p className="text-sm font-medium">{summary}</p>
            </div>

            {/* Signal grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {signals.map((signal) => {
                const series = priceData.find((p) => p.id === signal.inputId);
                const history = series
                  ? series.prices.map((p) => ({ value: p.price }))
                  : [];
                const sens = sensitivities.find((s) => s.inputId === signal.inputId);

                return (
                  <SignalCard
                    key={`${signal.inputId}-${signal.outputId}`}
                    signal={signal}
                    priceHistory={history}
                    sensitivity={sens}
                    onClick={() => setSelectedSignal(signal)}
                  />
                );
              })}
            </div>

            {/* Shock testing panel */}
            <div className="mb-6">
              <ShockPanel
                farm={activeFarm}
                prices={priceData}
                weekStart={currentWeek}
                baselineSignals={signals}
              />
            </div>

            {/* Historical detail view */}
            {selectedSignal && selectedMapping && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{selectedInputName} — Detail View</h3>
                  <button
                    onClick={() => setSelectedSignal(null)}
                    className="text-sm text-muted hover:text-foreground"
                  >
                    Close ×
                  </button>
                </div>

                {/* Season strip */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">
                    {inputs.find((i) => i.id === selectedSignal.inputId)?.category === "fertiliser"
                      ? "Application Window"
                      : "Feed Gap Window"}
                  </p>
                  <SeasonStrip
                    feedGapStart={selectedMapping.feedGapStartMonth}
                    feedGapEnd={selectedMapping.feedGapEndMonth}
                    appWindowStart={selectedMapping.applicationWindowStart}
                    appWindowEnd={selectedMapping.applicationWindowEnd}
                    currentMonth={currentMonth}
                    isFertiliser={inputs.find((i) => i.id === selectedSignal.inputId)?.category === "fertiliser"}
                  />
                  <p className="text-xs text-muted mt-2">{selectedMapping.conversionNote}</p>
                  {selectedMapping.substitutionFactor && (
                    <p className="text-xs text-green-signal mt-1">
                      Includes forage substitution credit: {selectedMapping.substitutionFactor} kg DM displaced × £{selectedMapping.substitutionValuePerUnit}/kg = £{((selectedMapping.substitutionFactor ?? 0) * (selectedMapping.substitutionValuePerUnit ?? 0)).toFixed(3)}/unit saved
                    </p>
                  )}
                </div>

                {/* Signal detail card */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                    <div>
                      <p className="text-xs text-muted">Percentile Signal</p>
                      <RAGBadge signal={selectedSignal.ragSignal} size="lg" />
                    </div>
                    <div>
                      <p className="text-xs text-muted">Absolute</p>
                      <div className="mt-1">
                        <AbsoluteBadge verdict={selectedSignal.absoluteVerdict} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Percentile</p>
                      <p className="text-2xl font-bold">{selectedSignal.percentileRank}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Ratio</p>
                      <p className="text-2xl font-bold">{selectedSignal.ratioValue.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Stability</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold">{selectedSignal.stabilityWeeks}w</p>
                        <StabilityIndicator
                          weeks={selectedSignal.stabilityWeeks}
                          trend={selectedSignal.trendDirection}
                          signal={selectedSignal.ragSignal}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted">In Season</p>
                      <p className="text-2xl font-bold">{selectedSignal.inSeasonGate ? "Yes" : "No"}</p>
                    </div>
                  </div>

                  {selectedSignal.ragSignal === "green" && selectedSignal.absoluteVerdict === "uneconomic" && (
                    <div className="mt-3 p-2 bg-amber-bg rounded-lg">
                      <p className="text-xs text-amber-signal font-semibold">
                        ⚠ This input is in the cheapest third historically, but its ratio ({selectedSignal.ratioValue.toFixed(3)}) is still above 1.0 — the input costs more than the output it supports at current conversion rates. It may still be worth buying if your farm&apos;s conversion efficiency exceeds the benchmark.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sensitivity gauge */}
                {selectedSensitivity && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <SensitivityGauge result={selectedSensitivity} />
                  </div>
                )}

                {/* Historical chart */}
                <HistoricalChart
                  data={historicalData}
                  inputName={selectedInputName}
                  outputName={selectedOutputName}
                />
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div className="bg-grey-bg rounded-xl p-4 text-xs text-muted mt-6">
          <p className="font-semibold mb-1">Disclaimer</p>
          <p>
            Signals are one input to a purchasing decision, not a mandate. Always consider cashflow,
            storage capacity, and stock condition. Conversion factors are industry benchmarks from AHDB
            data — individual farm efficiency will vary. <strong>Percentile signal</strong> = is this
            historically cheap? <strong>Absolute signal</strong> = is this input paying for itself at
            benchmark conversion rates? <strong>Sensitivity</strong> = does the signal hold if your
            farm&apos;s conversion rate differs from the benchmark? <strong>Robustness</strong> = composite
            score across shocks, stability, sensitivity, and economics. Price data is illustrative
            (MVP uses simulated historical series). This product applies Clark and Scanlon&apos;s MSO
            framework: inputs are rational when the numbers support them.
          </p>
        </div>
      </main>

      <footer className="border-t border-border mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-xs text-muted text-center">
          MSO Input Price Tracker · Cinder Hill Consulting · March 2026
        </div>
      </footer>
    </div>
  );
}

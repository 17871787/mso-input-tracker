"use client";

import { useMemo, useState } from "react";
import { farmProfiles } from "@/app/data/farm-profiles";
import { priceData } from "@/app/data/generate-prices";
import { inputs, outputs } from "@/app/data/inputs-outputs";
import { calculateWeeklySignals, generateFarmSummary, getHistoricalRatios } from "@/app/lib/ratio-engine";
import { WeeklySignal } from "@/app/lib/types";
import { SignalCard } from "@/app/components/SignalCard";
import { HistoricalChart } from "@/app/components/HistoricalChart";
import { SeasonStrip } from "@/app/components/SeasonStrip";
import { RAGBadge } from "@/app/components/RAGBadge";

const CURRENT_WEEK = "2026-03-09";
const CURRENT_MONTH = 3;

export default function Dashboard() {
  const [activeFarmId, setActiveFarmId] = useState(farmProfiles[0].id);
  const [selectedSignal, setSelectedSignal] = useState<WeeklySignal | null>(null);

  const activeFarm = farmProfiles.find((f) => f.id === activeFarmId)!;

  const signals = useMemo(
    () => calculateWeeklySignals(activeFarm, priceData, CURRENT_WEEK),
    [activeFarm]
  );

  const summary = useMemo(
    () => generateFarmSummary(activeFarm, signals),
    [activeFarm, signals]
  );

  const selectedMapping = selectedSignal
    ? activeFarm.inputMappings.find((m) => m.inputId === selectedSignal.inputId)
    : null;

  const historicalData = useMemo(() => {
    if (!selectedMapping) return [];
    return getHistoricalRatios(activeFarm, selectedMapping, priceData);
  }, [activeFarm, selectedMapping]);

  const selectedInputName = selectedSignal
    ? inputs.find((i) => i.id === selectedSignal.inputId)?.name ?? ""
    : "";

  const selectedOutputName = selectedSignal
    ? outputs.find((o) => o.id === selectedSignal.outputId)?.name ?? ""
    : "";

  // Count active signals
  const greenCount = signals.filter((s) => s.ragSignal === "green").length;
  const amberCount = signals.filter((s) => s.ragSignal === "amber").length;
  const redCount = signals.filter((s) => s.ragSignal === "red").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">MSO Input Price Tracker</h1>
              <p className="text-sm text-muted">
                Week of {new Date(CURRENT_WEEK).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-signal" />
                <span>{greenCount} buy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-signal" />
                <span>{amberCount} monitor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-signal" />
                <span>{redCount} avoid</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Farm selector tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
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

        {/* Farm info */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <h2 className="font-bold text-lg">{activeFarm.name}</h2>
              <p className="text-sm text-muted">{activeFarm.location} · {activeFarm.size} · {activeFarm.type}</p>
              <p className="text-sm mt-1">{activeFarm.enterprise}</p>
            </div>
            <div className="sm:max-w-md">
              <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-1">MSO Context</p>
              <p className="text-sm text-muted">{activeFarm.msoContext}</p>
            </div>
          </div>
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

            return (
              <SignalCard
                key={`${signal.inputId}-${signal.outputId}`}
                signal={signal}
                priceHistory={history}
                onClick={() => setSelectedSignal(signal)}
              />
            );
          })}
        </div>

        {/* Historical detail view */}
        {selectedSignal && selectedMapping && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">
                {selectedInputName} — Detail View
              </h3>
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
                currentMonth={CURRENT_MONTH}
                isFertiliser={inputs.find((i) => i.id === selectedSignal.inputId)?.category === "fertiliser"}
              />
              <p className="text-xs text-muted mt-2">{selectedMapping.conversionNote}</p>
            </div>

            {/* Signal summary */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted">Signal</p>
                  <RAGBadge signal={selectedSignal.ragSignal} size="lg" />
                </div>
                <div>
                  <p className="text-xs text-muted">Percentile</p>
                  <p className="text-2xl font-bold">{selectedSignal.percentileRank}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Current Ratio</p>
                  <p className="text-2xl font-bold">{selectedSignal.ratioValue.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">In Season</p>
                  <p className="text-2xl font-bold">{selectedSignal.inSeasonGate ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>

            {/* Historical chart */}
            <HistoricalChart
              data={historicalData}
              inputName={selectedInputName}
              outputName={selectedOutputName}
            />
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-grey-bg rounded-xl p-4 text-xs text-muted">
          <p className="font-semibold mb-1">Disclaimer</p>
          <p>
            Signals are one input to a purchasing decision, not a mandate. Always consider cashflow,
            storage capacity, and stock condition. Conversion factors are industry benchmarks from AHDB
            data — individual farm efficiency will vary. Price data is illustrative (MVP uses simulated
            historical series). This product applies Clark and Scanlon&apos;s MSO framework: inputs are rational
            when the numbers support them.
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

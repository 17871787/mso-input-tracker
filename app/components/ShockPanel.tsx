"use client";

import { useState, useMemo } from "react";
import { FarmProfile, PriceSeries, WeeklySignal, ShockScenario, ShockedSignal } from "@/app/lib/types";
import { shockScenarios, runShockTest } from "@/app/lib/ratio-engine";
import { inputs } from "@/app/data/inputs-outputs";
import { RAGBadge } from "./RAGBadge";

interface ShockPanelProps {
  farm: FarmProfile;
  prices: PriceSeries[];
  weekStart: string;
  baselineSignals: WeeklySignal[];
}

export function ShockPanel({ farm, prices, weekStart, baselineSignals }: ShockPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ShockScenario | null>(null);

  const shockedSignals = useMemo(() => {
    if (!activeScenario) return null;
    return runShockTest(farm, prices, weekStart, activeScenario, baselineSignals);
  }, [farm, prices, weekStart, activeScenario, baselineSignals]);

  // Run all scenarios to find which signals survive everything
  const allScenariosResults = useMemo(() => {
    if (!open) return null;
    const results: Record<string, ShockedSignal[]> = {};
    for (const scenario of shockScenarios) {
      results[scenario.id] = runShockTest(farm, prices, weekStart, scenario, baselineSignals);
    }
    return results;
  }, [open, farm, prices, weekStart, baselineSignals]);

  // Count signals that survive all shocks without worsening
  const robustSignals = useMemo(() => {
    if (!allScenariosResults) return [];
    return baselineSignals
      .filter((s) => s.ragSignal !== "grey")
      .filter((s) => {
        return shockScenarios.every((scenario) => {
          const shocked = allScenariosResults[scenario.id]?.find((r) => r.inputId === s.inputId);
          return shocked && !shocked.worsened;
        });
      })
      .map((s) => s.inputId);
  }, [allScenariosResults, baselineSignals]);

  const getName = (id: string) => inputs.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-background transition-colors"
      >
        <div>
          <h3 className="font-semibold text-sm">Stress Test — What If?</h3>
          <p className="text-xs text-muted">Test how signals change under price shocks</p>
        </div>
        <span className="text-muted text-lg">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3">
          {/* Scenario buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {shockScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setActiveScenario(
                  activeScenario?.id === scenario.id ? null : scenario
                )}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeScenario?.id === scenario.id
                    ? "bg-foreground text-background"
                    : "bg-background border border-border text-muted hover:text-foreground"
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>

          {/* Active scenario description */}
          {activeScenario && (
            <p className="text-xs text-muted mb-3 italic">{activeScenario.description}</p>
          )}

          {/* Results table */}
          {shockedSignals && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 pr-3">Input</th>
                    <th className="text-center py-2 px-2">Baseline</th>
                    <th className="text-center py-2 px-2">Shocked</th>
                    <th className="text-right py-2 px-2">Ratio shift</th>
                    <th className="text-center py-2 pl-2">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {shockedSignals.map((result) => (
                    <tr
                      key={result.inputId}
                      className={`border-b border-border last:border-0 ${
                        result.worsened ? "bg-red-bg/30" : ""
                      }`}
                    >
                      <td className="py-2 pr-3 font-medium">{getName(result.inputId)}</td>
                      <td className="py-2 px-2 text-center">
                        <RAGBadge signal={result.baselineRag} size="sm" />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <RAGBadge signal={result.shockedRag} size="sm" />
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-xs">
                        {result.baselineRatio.toFixed(3)} → {result.shockedRatio.toFixed(3)}
                      </td>
                      <td className="py-2 pl-2 text-center">
                        {result.worsened ? (
                          <span className="text-red-signal font-semibold text-xs">WORSE</span>
                        ) : result.ragChanged ? (
                          <span className="text-amber-signal font-semibold text-xs">SHIFTED</span>
                        ) : (
                          <span className="text-green-signal font-semibold text-xs">HOLDS</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Robust signals summary */}
          {allScenariosResults && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                Signals that survive all shocks
              </p>
              {robustSignals.length > 0 ? (
                <p className="text-sm">
                  <span className="text-green-signal font-semibold">
                    {robustSignals.map(getName).join(", ")}
                  </span>
                  {" "}— robust across all {shockScenarios.length} scenarios
                </p>
              ) : (
                <p className="text-sm text-muted italic">
                  No signals survive all shock scenarios unchanged. Current purchasing environment is fragile.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

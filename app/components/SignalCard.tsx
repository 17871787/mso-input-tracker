"use client";

import { WeeklySignal, SensitivityResult } from "@/app/lib/types";
import { inputs, outputs } from "@/app/data/inputs-outputs";
import { RAGBadge } from "./RAGBadge";
import { AbsoluteBadge } from "./AbsoluteBadge";
import { StabilityIndicator } from "./StabilityIndicator";
import { SensitivityGauge } from "./SensitivityGauge";
import { Sparkline } from "./Sparkline";

interface SignalCardProps {
  signal: WeeklySignal;
  priceHistory: { value: number }[];
  sensitivity?: SensitivityResult;
  onClick: () => void;
}

export function SignalCard({ signal, priceHistory, sensitivity, onClick }: SignalCardProps) {
  const input = inputs.find((i) => i.id === signal.inputId);
  const output = outputs.find((o) => o.id === signal.outputId);

  if (!input) return null;

  const formatPrice = (price: number, unit: string) => {
    if (unit.includes("p/")) return `${price.toFixed(1)}${unit}`;
    if (unit.includes("£/bale")) return `£${price.toFixed(0)}`;
    return `£${price.toFixed(0)}/t`;
  };

  const conflictWarning =
    signal.ragSignal === "green" && signal.absoluteVerdict === "uneconomic";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-card border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${
        conflictWarning ? "border-amber-signal" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{input.name}</h3>
          <p className="text-xs text-muted mt-0.5">vs {output?.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RAGBadge signal={signal.ragSignal} size="sm" />
          <AbsoluteBadge verdict={signal.absoluteVerdict} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-xs text-muted">Price</p>
          <p className="text-base font-bold">{formatPrice(signal.currentInputPrice, input.unit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Ratio</p>
          <p className="text-base font-bold">{signal.ratioValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">%ile</p>
          <div className="flex items-center gap-1">
            <p className="text-base font-bold">
              {signal.ragSignal === "grey" ? "—" : `${signal.percentileRank}%`}
            </p>
            <StabilityIndicator
              weeks={signal.stabilityWeeks}
              trend={signal.trendDirection}
              signal={signal.ragSignal}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1">
          <Sparkline
            data={priceHistory.slice(-52)}
            color={
              signal.ragSignal === "green" ? "#16a34a" :
              signal.ragSignal === "red" ? "#dc2626" :
              signal.ragSignal === "amber" ? "#d97706" : "#9ca3af"
            }
          />
        </div>
        {sensitivity && (
          <SensitivityGauge result={sensitivity} compact />
        )}
      </div>

      {conflictWarning && (
        <p className="text-[10px] text-amber-signal font-semibold mt-1">
          ⚠ Historically cheap but still above break-even
        </p>
      )}

      {!signal.inSeasonGate && (
        <p className="text-xs text-muted mt-1 italic">
          Out of season — signal suppressed
        </p>
      )}
    </button>
  );
}

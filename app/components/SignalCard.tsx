"use client";

import { WeeklySignal } from "@/app/lib/types";
import { inputs, outputs } from "@/app/data/inputs-outputs";
import { RAGBadge } from "./RAGBadge";
import { Sparkline } from "./Sparkline";

interface SignalCardProps {
  signal: WeeklySignal;
  priceHistory: { value: number }[];
  onClick: () => void;
}

export function SignalCard({ signal, priceHistory, onClick }: SignalCardProps) {
  const input = inputs.find((i) => i.id === signal.inputId);
  const output = outputs.find((o) => o.id === signal.outputId);

  if (!input) return null;

  const formatPrice = (price: number, unit: string) => {
    if (unit.includes("p/")) return `${price.toFixed(1)}${unit}`;
    if (unit.includes("£/bale")) return `£${price.toFixed(0)}`;
    return `£${price.toFixed(0)}/t`;
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{input.name}</h3>
          <p className="text-xs text-muted mt-0.5">vs {output?.name}</p>
        </div>
        <RAGBadge signal={signal.ragSignal} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-muted">Current price</p>
          <p className="text-lg font-bold">{formatPrice(signal.currentInputPrice, input.unit)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Ratio</p>
          <p className="text-lg font-bold">{signal.ratioValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
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
        <div className="text-right">
          <p className="text-xs text-muted">Percentile</p>
          <p className="text-sm font-semibold">
            {signal.ragSignal === "grey" ? "—" : `${signal.percentileRank}%`}
          </p>
        </div>
      </div>

      {!signal.inSeasonGate && (
        <p className="text-xs text-muted mt-2 italic">
          Out of season — signal suppressed
        </p>
      )}
    </button>
  );
}

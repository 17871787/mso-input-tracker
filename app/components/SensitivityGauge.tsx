"use client";

import { SensitivityResult, RAGSignal } from "@/app/lib/types";

const ragColor: Record<RAGSignal, string> = {
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  grey: "#9ca3af",
};

interface SensitivityGaugeProps {
  result: SensitivityResult;
  compact?: boolean;
}

export function SensitivityGauge({ result, compact = false }: SensitivityGaugeProps) {
  if (compact) {
    return (
      <span
        title={`Sensitivity: ${result.sensitivity}${result.signalChanges ? " — signal changes within ±20% of conversion factor" : ""}`}
        className={`inline-flex items-center text-[10px] font-semibold ${
          result.sensitivity === "high"
            ? "text-red-signal"
            : result.sensitivity === "medium"
            ? "text-amber-signal"
            : "text-muted"
        }`}
      >
        {result.sensitivity === "high" ? "△" : result.sensitivity === "medium" ? "◇" : "●"}
      </span>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-muted">Conversion sensitivity</p>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            result.sensitivity === "high"
              ? "bg-red-bg text-red-signal"
              : result.sensitivity === "medium"
              ? "bg-amber-bg text-amber-signal"
              : "bg-green-bg text-green-signal"
          }`}
        >
          {result.sensitivity.toUpperCase()}
        </span>
      </div>
      {/* Mini bar chart: 5 bars for 0.8x to 1.2x */}
      <div className="flex items-end gap-1 h-8">
        {result.sweepResults.map((r) => (
          <div key={r.factor} className="flex flex-col items-center flex-1">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(4, Math.min(32, r.percentile * 0.32))}px`,
                backgroundColor: ragColor[r.rag],
                opacity: r.factor === 1.0 ? 1 : 0.6,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 text-[9px] text-muted">
        {result.sweepResults.map((r) => (
          <div key={r.factor} className="flex-1 text-center">
            {r.factor === 1.0 ? (
              <span className="font-bold text-foreground">1.0×</span>
            ) : (
              `${r.factor}×`
            )}
          </div>
        ))}
      </div>
      {result.signalChanges && (
        <p className="text-[10px] text-amber-signal mt-1">
          Signal changes across conversion factor range — verify your farm&apos;s actual efficiency
        </p>
      )}
    </div>
  );
}

"use client";

import { RAGSignal } from "@/app/lib/types";

interface StabilityIndicatorProps {
  weeks: number;
  trend: "improving" | "worsening" | "stable";
  signal: RAGSignal;
}

export function StabilityIndicator({ weeks, trend, signal }: StabilityIndicatorProps) {
  if (signal === "grey") return null;

  const trendIcon = trend === "improving" ? "↓" : trend === "worsening" ? "↑" : "→";
  const trendColor =
    trend === "improving" ? "text-green-signal" :
    trend === "worsening" ? "text-red-signal" : "text-muted";
  const trendLabel =
    trend === "improving" ? "Improving" :
    trend === "worsening" ? "Worsening" : "Stable";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted">
        {weeks <= 1 ? (
          <span className="font-semibold text-amber-signal">NEW</span>
        ) : (
          `${weeks}w`
        )}
      </span>
      <span className={`font-semibold ${trendColor}`} title={trendLabel}>
        {trendIcon}
      </span>
    </div>
  );
}

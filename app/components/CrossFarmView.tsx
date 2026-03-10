"use client";

import { useMemo } from "react";
import { FarmProfile, PriceSeries } from "@/app/lib/types";
import { buildCrossFarmComparison } from "@/app/lib/ratio-engine";
import { RAGBadge } from "./RAGBadge";
import { AbsoluteBadge } from "./AbsoluteBadge";

interface CrossFarmViewProps {
  farms: FarmProfile[];
  prices: PriceSeries[];
  weekStart: string;
}

export function CrossFarmView({ farms, prices, weekStart }: CrossFarmViewProps) {
  const rows = useMemo(
    () => buildCrossFarmComparison(farms, prices, weekStart),
    [farms, prices, weekStart]
  );

  // Build a plain English cross-farm insight
  const insight = useMemo(() => {
    const parts: string[] = [];
    for (const row of rows) {
      const activeCells = row.cells.filter((c) => c.signal && c.signal.ragSignal !== "grey");
      if (activeCells.length < 2) continue;

      const greens = activeCells.filter((c) => c.signal!.ragSignal === "green");
      const reds = activeCells.filter((c) => c.signal!.ragSignal === "red");

      if (greens.length > 0 && reds.length > 0) {
        parts.push(
          `${row.inputName} is green for ${greens.map((c) => c.farmName).join(", ")} but red for ${reds.map((c) => c.farmName).join(", ")}`
        );
      }
    }
    return parts.length > 0
      ? parts.join(". ") + "."
      : "No cross-farm signal conflicts this week.";
  }, [rows]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-1">Cross-Farm Comparison</h3>
      <p className="text-xs text-muted mb-3">
        Same input, different rationality — because conversion efficiency varies by farm type.
      </p>

      {/* Insight sentence */}
      <div className="bg-background rounded-lg p-3 mb-4">
        <p className="text-sm">{insight}</p>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-3 text-xs text-muted font-semibold">Input</th>
              {farms.map((farm) => (
                <th key={farm.id} className="text-center py-2 px-2 text-xs text-muted font-semibold">
                  <div>{farm.name}</div>
                  <div className="font-normal opacity-70">{farm.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.inputId} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-3 font-medium text-xs">{row.inputName}</td>
                {row.cells.map((cell) => (
                  <td key={cell.farmId} className="py-2.5 px-2 text-center">
                    {cell.signal ? (
                      <div className="flex flex-col items-center gap-1">
                        <RAGBadge signal={cell.signal.ragSignal} size="sm" />
                        <span className="text-[10px] font-mono text-muted">
                          {cell.signal.ragSignal === "grey"
                            ? "—"
                            : cell.signal.ratioValue.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

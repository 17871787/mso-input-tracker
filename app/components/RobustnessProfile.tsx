"use client";

import { RobustnessScore } from "@/app/lib/types";

interface RobustnessProfileProps {
  score: RobustnessScore;
  farmName: string;
}

const componentLabels: { key: keyof RobustnessScore["components"]; label: string; desc: string }[] = [
  { key: "shockSurvival", label: "Shock", desc: "Survives price shocks" },
  { key: "signalStability", label: "Stability", desc: "Signals held consistently" },
  { key: "sensitivityResilience", label: "Sensitivity", desc: "Low conversion factor sensitivity" },
  { key: "absoluteHealth", label: "Economics", desc: "Inputs profitable at benchmark" },
  { key: "seasonalCoverage", label: "Season", desc: "Inputs in active season" },
];

function scoreColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

export function RobustnessProfile({ score, farmName }: RobustnessProfileProps) {
  const color = scoreColor(score.overall);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Farm Robustness — {farmName}</h3>

      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e7e5e4"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={`${score.overall}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color }}>{score.overall}</span>
          </div>
        </div>

        {/* Component bars */}
        <div className="flex-1 space-y-1.5">
          {componentLabels.map(({ key, label, desc }) => {
            const val = score.components[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-16 text-right" title={desc}>{label}</span>
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${val}%`,
                      backgroundColor: scoreColor(val),
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono w-7 text-right">{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fragility flags */}
      {score.fragility.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {score.fragility.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded-full bg-red-bg text-red-signal text-[10px] font-semibold"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

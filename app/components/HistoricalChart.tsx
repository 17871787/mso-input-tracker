"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { RAGSignal } from "@/app/lib/types";

interface HistoricalChartProps {
  data: { weekStart: string; ratio: number; percentile: number; rag: RAGSignal }[];
  inputName: string;
  outputName: string;
}

export function HistoricalChart({ data, inputName, outputName }: HistoricalChartProps) {
  const chartData = data.map((d) => ({
    date: d.weekStart,
    ratio: d.ratio,
    percentile: d.percentile,
    fill:
      d.rag === "green" ? "#dcfce7" :
      d.rag === "red" ? "#fee2e2" :
      d.rag === "amber" ? "#fef3c7" : "#f3f4f6",
    stroke:
      d.rag === "green" ? "#16a34a" :
      d.rag === "red" ? "#dc2626" :
      d.rag === "amber" ? "#d97706" : "#9ca3af",
  }));

  const ratios = data.map((d) => d.ratio);
  const p33 = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length * 0.33)] ?? 0;
  const p67 = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length * 0.67)] ?? 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-1">
        {inputName} : {outputName} — 156-week ratio history
      </h3>
      <p className="text-xs text-muted mb-4">
        Green band = buy zone (bottom third). Red band = avoid (top third).
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) => {
              const d = new Date(v);
              return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
            }}
            interval={12}
          />
          <YAxis tick={{ fontSize: 10 }} domain={["dataMin", "dataMax"]} />
          <Tooltip
            labelFormatter={(v) => {
              const d = new Date(String(v));
              return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            }}
            formatter={(value, name) => {
              if (name === "ratio") return [Number(value).toFixed(3), "Ratio"];
              return [value, name];
            }}
          />
          <ReferenceLine
            y={p33}
            stroke="#16a34a"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "33rd %ile", position: "right", fontSize: 10, fill: "#16a34a" }}
          />
          <ReferenceLine
            y={p67}
            stroke="#dc2626"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "67th %ile", position: "right", fontSize: 10, fill: "#dc2626" }}
          />
          <Area
            type="monotone"
            dataKey="ratio"
            stroke="#44403c"
            strokeWidth={1.5}
            fill="#e7e5e4"
            fillOpacity={0.3}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

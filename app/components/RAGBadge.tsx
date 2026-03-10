"use client";

import { RAGSignal } from "@/app/lib/types";

const config: Record<RAGSignal, { bg: string; text: string; label: string; emoji: string }> = {
  green: { bg: "bg-green-bg", text: "text-green-signal", label: "Buy Zone", emoji: "🟢" },
  amber: { bg: "bg-amber-bg", text: "text-amber-signal", label: "Monitor", emoji: "🟡" },
  red: { bg: "bg-red-bg", text: "text-red-signal", label: "Avoid", emoji: "🔴" },
  grey: { bg: "bg-grey-bg", text: "text-grey-signal", label: "Out of Season", emoji: "⚪" },
};

export function RAGBadge({ signal, size = "md" }: { signal: RAGSignal; size?: "sm" | "md" | "lg" }) {
  const c = config[signal];
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${c.bg} ${c.text} ${sizeClasses[size]}`}>
      <span>{c.emoji}</span>
      <span>{c.label}</span>
    </span>
  );
}

"use client";

import { AbsoluteVerdict } from "@/app/lib/types";

const config: Record<AbsoluteVerdict, { bg: string; text: string; label: string }> = {
  profitable: { bg: "bg-green-bg", text: "text-green-signal", label: "Profitable" },
  marginal: { bg: "bg-amber-bg", text: "text-amber-signal", label: "Marginal" },
  uneconomic: { bg: "bg-red-bg", text: "text-red-signal", label: "Uneconomic" },
};

export function AbsoluteBadge({ verdict }: { verdict: AbsoluteVerdict }) {
  const c = config[verdict];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

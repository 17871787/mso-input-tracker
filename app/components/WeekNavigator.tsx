"use client";

interface WeekNavigatorProps {
  weeks: string[];
  currentWeek: string;
  onChange: (week: string) => void;
}

export function WeekNavigator({ weeks, currentWeek, onChange }: WeekNavigatorProps) {
  const currentIdx = weeks.indexOf(currentWeek);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < weeks.length - 1;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const weekNumber = currentIdx + 1;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => hasPrev && onChange(weeks[currentIdx - 1])}
        disabled={!hasPrev}
        className="px-2 py-1 rounded text-sm font-medium disabled:opacity-30 hover:bg-border transition-colors"
      >
        ← Prev
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold">
          Week of {formatDate(currentWeek)}
        </p>
        <p className="text-xs text-muted">
          Week {weekNumber} of {weeks.length}
        </p>
      </div>
      <button
        onClick={() => hasNext && onChange(weeks[currentIdx + 1])}
        disabled={!hasNext}
        className="px-2 py-1 rounded text-sm font-medium disabled:opacity-30 hover:bg-border transition-colors"
      >
        Next →
      </button>
    </div>
  );
}

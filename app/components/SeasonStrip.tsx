"use client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface SeasonStripProps {
  feedGapStart?: number;
  feedGapEnd?: number;
  appWindowStart?: number;
  appWindowEnd?: number;
  currentMonth: number; // 1-12
  isFertiliser: boolean;
}

function isActive(month: number, start?: number, end?: number): boolean {
  if (!start || !end) return true;
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
}

export function SeasonStrip({ feedGapStart, feedGapEnd, appWindowStart, appWindowEnd, currentMonth, isFertiliser }: SeasonStripProps) {
  const start = isFertiliser ? appWindowStart : feedGapStart;
  const end = isFertiliser ? appWindowEnd : feedGapEnd;

  return (
    <div className="flex gap-0.5">
      {MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const active = isActive(monthNum, start, end);
        const isCurrent = monthNum === currentMonth;

        return (
          <div
            key={m}
            className={`flex-1 text-center text-[10px] py-1 rounded ${
              isCurrent
                ? active
                  ? "bg-green-signal text-white font-bold"
                  : "bg-grey-signal text-white font-bold"
                : active
                  ? "bg-green-bg text-green-signal"
                  : "bg-grey-bg text-grey-signal"
            }`}
          >
            {m}
          </div>
        );
      })}
    </div>
  );
}

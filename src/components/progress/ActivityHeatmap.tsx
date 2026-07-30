type Day = { day: string; minutes: number; topics: number };

function level(minutes: number, target: number) {
  if (minutes <= 0) return 0;
  const ratio = minutes / Math.max(target, 1);
  if (ratio < 0.34) return 1;
  if (ratio < 0.67) return 2;
  if (ratio < 1) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-surface-strong",
  "bg-brand/25",
  "bg-brand/50",
  "bg-brand/75",
  "bg-brand",
];

export function ActivityHeatmap({ days, target }: { days: Day[]; target: number }) {
  // Split into 12 columns of 7 days (oldest → newest).
  const weeks: Day[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="surface-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-muted">Last 12 weeks</span>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
          Less
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-[3px] ${c}`} />
          ))}
          More
        </div>
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {week.map((d) => (
              <span
                key={d.day}
                title={`${d.day} · ${d.minutes} min`}
                className={`h-3.5 w-3.5 rounded-[4px] ${LEVEL_CLASS[level(d.minutes, target)]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

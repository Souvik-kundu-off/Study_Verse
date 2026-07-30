import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type Day = { day: string; minutes: number };

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyChart({ days, target }: { days: Day[]; target: number }) {
  const data = days.slice(-7).map((d) => ({
    label: WEEKDAY[new Date(`${d.day}T00:00:00Z`).getUTCDay()],
    minutes: d.minutes,
    hit: d.minutes >= target,
  }));

  return (
    <div className="surface-card p-6">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-widest text-ink-muted">This week</span>
        <span className="text-xs text-ink-subtle">Target {target} min/day</span>
      </div>

      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-strong)" }}
              contentStyle={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--color-ink)",
              }}
              formatter={(v: number) => [`${v} min`, "Studied"]}
            />
            <ReferenceLine
              y={target}
              stroke="var(--color-border-strong)"
              strokeDasharray="3 3"
            />
            <Bar dataKey="minutes" radius={[6, 6, 6, 6]} maxBarSize={26}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.hit ? "var(--color-brand)" : "var(--color-surface-strong)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

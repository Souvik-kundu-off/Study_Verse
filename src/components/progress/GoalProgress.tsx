import { Clock, Target, TrendingUp } from "lucide-react";

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r}m` : `${h}h ${r}m`;
}

export function GoalProgress({
  completed,
  total,
  totalMinutes,
  minutesPerDay,
  remainingMinutes,
}: {
  completed: number;
  total: number;
  totalMinutes: number;
  minutesPerDay: number;
  remainingMinutes: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const daysLeft =
    minutesPerDay > 0 ? Math.ceil(remainingMinutes / minutesPerDay) : null;

  const size = 108;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="surface-card flex flex-wrap items-center gap-8 p-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-slate-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="stroke-blue-600 transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-bold text-slate-900">{pct}%</span>
        </div>
      </div>

      <div className="grid flex-1 gap-4 sm:grid-cols-3">
        <Metric icon={Target} label="Topics" value={`${completed}/${total}`} />
        <Metric icon={Clock} label="Time invested" value={formatMinutes(totalMinutes)} />
        <Metric
          icon={TrendingUp}
          label="At current pace"
          value={daysLeft === null ? "—" : daysLeft === 0 ? "Done" : `${daysLeft} days left`}
        />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

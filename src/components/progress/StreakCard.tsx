import { Flame } from "lucide-react";

export function StreakCard({
  current,
  longest,
  studiedToday,
}: {
  current: number;
  longest: number;
  studiedToday: boolean;
}) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Daily Streak</span>
        <div className={`p-1.5 rounded-md ${studiedToday ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-400"}`}>
          <Flame className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-4xl font-extrabold tracking-tight text-slate-900">
        {current}
        <span className="ml-2 font-sans text-sm font-medium text-slate-500">
          {current === 1 ? "day" : "days"}
        </span>
      </p>
      <p className="mt-2 text-xs font-medium text-slate-600">
        {studiedToday
          ? "Studied today — streak active!"
          : current > 0
            ? "Study today to extend your streak."
            : "Complete a topic today to start your streak."}
      </p>
      <div className="mt-4 border-t border-slate-200 pt-3 text-xs font-medium text-slate-500">
        Longest streak · <span className="font-semibold text-slate-900">{longest} days</span>
      </div>
    </div>
  );
}

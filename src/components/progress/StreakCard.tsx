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
      <div className="flex items-center justify-between text-ink-muted">
        <span className="text-xs uppercase tracking-widest">Streak</span>
        <Flame className={`h-4 w-4 ${studiedToday ? "text-brand" : "text-ink-subtle"}`} />
      </div>
      <p className="mt-3 font-display text-5xl text-ink">
        {current}
        <span className="ml-2 font-sans text-base text-ink-muted">
          {current === 1 ? "day" : "days"}
        </span>
      </p>
      <p className="mt-2 text-xs text-ink-subtle">
        {studiedToday
          ? "Studied today — keep it alive tomorrow."
          : current > 0
            ? "Study today to extend your streak."
            : "Start a session to begin a streak."}
      </p>
      <div className="mt-4 border-t border-border pt-3 text-xs text-ink-muted">
        Longest streak · <span className="text-ink">{longest} days</span>
      </div>
    </div>
  );
}

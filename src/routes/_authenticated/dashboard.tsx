import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getProgress } from "@/lib/progress.functions";
import { StreakCard } from "@/components/progress/StreakCard";
import { ActivityHeatmap } from "@/components/progress/ActivityHeatmap";
import { WeeklyChart } from "@/components/progress/WeeklyChart";
import { GoalProgress } from "@/components/progress/GoalProgress";
import { ArrowRight, Flame, Clock, Sparkles, CheckCircle2, Circle, Target, RotateCcw } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: z.object({ newGoal: z.string().optional() }).optional(),
  head: () => ({
    meta: [
      { title: "Today's Mission — StudyVerse" },
      {
        name: "description",
        content:
          "Your personalized study dashboard: today's mission, streaks, weekly study time and roadmap progress.",
      },
      { property: "og:title", content: "Today's Mission — StudyVerse" },
      {
        property: "og:description",
        content: "Track your streak, study time, and roadmap progress in one focused view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});


type Topic = {
  id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  status: string;
  ordinal: number;
  module_id: string;
};

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: goal } = useQuery({
    queryKey: ["active-goal", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, description, category, level, minutes_per_day, deadline")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: topics } = useQuery({
    enabled: !!goal?.id,
    queryKey: ["goal-topics", goal?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_topics")
        .select("id, title, description, estimated_minutes, status, ordinal, module_id")
        .eq("goal_id", goal!.id)
        .order("ordinal", { ascending: true });
      if (error) throw error;
      return data as Topic[];
    },
  });

  const fetchProgress = useServerFn(getProgress);
  const { data: progress } = useQuery({
    queryKey: ["progress", user.id],
    queryFn: () => fetchProgress(),
  });

  // Order topics by module then ordinal
  const orderedTopics = topics
    ? [...topics].sort((a, b) => a.module_id.localeCompare(b.module_id) || a.ordinal - b.ordinal)
    : [];

  const currentTopic = orderedTopics.find((t) => t.status !== "completed");
  const completed = orderedTopics.filter((t) => t.status === "completed").length;
  const total = orderedTopics.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remainingMinutes = orderedTopics
    .filter((t) => t.status !== "completed")
    .reduce((s, t) => s + (t.estimated_minutes ?? 0), 0);

  const weekMinutes = progress?.weekMinutes ?? 0;
  const streak = progress?.currentStreak ?? 0;
  const dailyTarget = goal?.minutes_per_day ?? 60;


  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user.user_metadata?.full_name ?? user.email ?? "").toString().split(" ")[0]?.split("@")[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{greeting}, {firstName}.</p>
          <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
            Today's mission.
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-brand" /> {streak}-day streak
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {formatMinutes(weekMinutes)} this week
          </span>
        </div>
      </div>

      {/* Today's Mission */}
      <section className="mt-8 grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="surface-card p-8">
          {currentTopic ? (
            <>
              <p className="text-xs uppercase tracking-widest text-ink-subtle">
                Continue · {goal?.title}
              </p>
              <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
                {currentTopic.title}
              </h2>
              <p className="mt-2 max-w-lg text-ink-muted">{currentTopic.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {currentTopic.estimated_minutes} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Topic {completed + 1} of {total}
                </span>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/focus/$topicId"
                  params={{ topicId: currentTopic.id }}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
                >
                  Continue learning <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/focus/$topicId"
                  params={{ topicId: currentTopic.id }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-ink transition hover:bg-surface-strong"
                >
                  <Sparkles className="h-4 w-4" /> Ask tutor
                </Link>
              </div>
            </>
          ) : goal ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-subtle">All done</p>
              <h2 className="mt-3 font-display text-3xl text-ink">You've completed your roadmap.</h2>
              <p className="mt-2 text-ink-muted">Time to set your next goal.</p>
              <Link
                to="/onboarding"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background"
              >
                Start a new goal <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="animate-pulse">
              <div className="h-3 w-24 rounded bg-surface-strong" />
              <div className="mt-4 h-8 w-3/4 rounded bg-surface-strong" />
              <div className="mt-2 h-4 w-full rounded bg-surface-strong" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <StatCard label="Streak" value={`${streak} days`} icon={Flame} />
          <StatCard label="This week" value={formatMinutes(weekMinutes)} icon={Clock} />
          <StatCard label="Progress" value={`${progressPct}%`} icon={Target} sub={`${completed}/${total} topics`} />
        </div>
      </section>

      {/* Progress & streaks */}
      <section className="mt-14">
        <p className="text-xs uppercase tracking-widest text-ink-subtle">Your progress</p>
        <h2 className="mt-2 font-display text-3xl text-ink">Consistency compounds.</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <StreakCard
            current={progress?.currentStreak ?? 0}
            longest={progress?.longestStreak ?? 0}
            studiedToday={progress?.studiedToday ?? false}
          />
          <WeeklyChart days={progress?.days ?? []} target={dailyTarget} />
        </div>

        <div className="mt-4 grid gap-4">
          <ActivityHeatmap days={progress?.days ?? []} target={dailyTarget} />
          <GoalProgress
            completed={completed}
            total={total}
            totalMinutes={progress?.totalMinutes ?? 0}
            minutesPerDay={dailyTarget}
            remainingMinutes={remainingMinutes}
          />
        </div>
      </section>



      {/* Roadmap */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-subtle">Your roadmap</p>
            <h2 className="mt-2 font-display text-3xl text-ink">
              {goal?.title ?? "Your journey"}
            </h2>
          </div>
          <button
            onClick={() => (window.location.href = "/onboarding")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New goal
          </button>
        </div>

        <ModuleList goalId={goal?.id ?? null} />
      </section>
    </main>
  );
}

function ModuleList({ goalId }: { goalId: string | null }) {
  const { data } = useQuery({
    enabled: !!goalId,
    queryKey: ["modules", goalId],
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from("roadmap_modules")
        .select("id, title, description, estimated_minutes, ordinal")
        .eq("goal_id", goalId!)
        .order("ordinal", { ascending: true });
      if (error) throw error;
      const { data: topics, error: e2 } = await supabase
        .from("roadmap_topics")
        .select("id, title, module_id, ordinal, status, estimated_minutes")
        .eq("goal_id", goalId!)
        .order("ordinal", { ascending: true });
      if (e2) throw e2;
      return { modules, topics };
    },
  });

  if (!data) return null;

  return (
    <div className="mt-6 space-y-4">
      {data.modules.map((mod, mi) => {
        const modTopics = data.topics.filter((t) => t.module_id === mod.id);
        const done = modTopics.filter((t) => t.status === "completed").length;
        return (
          <div key={mod.id} className="surface-card overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="font-display text-2xl text-ink-subtle">
                  {String(mi + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-lg font-medium text-ink">{mod.title}</h3>
                <p className="mt-1 max-w-xl text-sm text-ink-muted">{mod.description}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-ink-muted">
                <div>{done}/{modTopics.length} done</div>
                <div>{mod.estimated_minutes} min</div>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {modTopics.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/focus/$topicId"
                    params={{ topicId: t.id }}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-surface-strong"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {t.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-ink-subtle" />
                      )}
                      <span
                        className={`truncate text-sm ${
                          t.status === "completed" ? "text-ink-subtle line-through" : "text-ink"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-ink-subtle">{t.estimated_minutes}m</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between text-ink-muted">
        <span className="text-xs uppercase tracking-widest">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-subtle">{sub}</p>}
    </div>
  );
}

function formatMinutes(m: number) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return `${h}h ${r}m`;
}

function calcStreak(dates: string[]) {
  const days = new Set(dates.map((d) => new Date(d).toDateString()));
  let streak = 0;
  const cur = new Date();
  while (days.has(cur.toDateString())) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

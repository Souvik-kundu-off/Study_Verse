import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, RotateCcw, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Roadmap — StudyVerse" }] }),
  component: RoadmapPage,
});

function RoadmapPage() {
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

  const { data } = useQuery({
    enabled: !!goal?.id,
    queryKey: ["roadmap-full", goal?.id],
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from("roadmap_modules")
        .select("id, title, description, estimated_minutes, ordinal")
        .eq("goal_id", goal!.id)
        .order("ordinal", { ascending: true });
      if (error) throw error;
      const { data: topics, error: e2 } = await supabase
        .from("roadmap_topics")
        .select("id, title, module_id, ordinal, status, estimated_minutes, description")
        .eq("goal_id", goal!.id)
        .order("ordinal", { ascending: true });
      if (e2) throw e2;
      return { modules, topics };
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-subtle">Your roadmap</p>
          <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">
            {goal?.title ?? "Your journey"}
          </h1>
          {goal?.description && (
            <p className="mt-3 max-w-2xl text-ink-muted">{goal.description}</p>
          )}
        </div>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" /> New goal
        </Link>
      </div>

      {!goal && (
        <div className="mt-10 surface-card p-8 text-center">
          <Target className="mx-auto h-6 w-6 text-ink-muted" />
          <p className="mt-3 text-ink-muted">No active goal yet.</p>
          <Link
            to="/onboarding"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background"
          >
            Create a goal
          </Link>
        </div>
      )}

      {data && (
        <div className="mt-10 space-y-5">
          {data.modules.map((mod, mi) => {
            const modTopics = data.topics.filter((t) => t.module_id === mod.id);
            const done = modTopics.filter((t) => t.status === "completed").length;
            return (
              <div key={mod.id} className="surface-card overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-border p-6">
                  <div>
                    <p className="font-display text-2xl text-ink-subtle">
                      {String(mi + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-1 text-xl font-medium text-ink">{mod.title}</h2>
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
                        className="flex items-center justify-between gap-3 px-6 py-4 transition hover:bg-surface-strong"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {t.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-ink-subtle" />
                          )}
                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm ${
                                t.status === "completed" ? "text-ink-subtle line-through" : "text-ink"
                              }`}
                            >
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="truncate text-xs text-ink-subtle">{t.description}</p>
                            )}
                          </div>
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
      )}
    </main>
  );
}

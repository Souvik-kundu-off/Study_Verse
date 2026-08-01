import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { CreateTrackModal } from "@/components/study/CreateTrackModal";
import { CheckCircle2, Circle, RotateCcw, Target, Plus, BookMarked, Sunrise, Sun, Sunset, Moon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Your Learning Roadmap — StudyVerse" },
      {
        name: "description",
        content:
          "The full AI-generated roadmap for your goal, broken into progressive modules and topics you can study one at a time.",
      },
      { property: "og:title", content: "Your Learning Roadmap — StudyVerse" },
      {
        property: "og:description",
        content: "Progressive modules and topics, generated for your specific goal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapPage,
});

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string;
  time_slot_preference?: string | null;
  is_active: boolean;
};

function RoadmapPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Redirect Admins to /admin
  const { data: profile } = useQuery({
    queryKey: ["profileRoleCheckRoadmap", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile?.role === "admin") {
      navigate({ to: "/admin", replace: true });
    } else if (profile?.role === "instructor") {
      navigate({ to: "/teacher", replace: true });
    }
  }, [profile, navigate]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: allGoals } = useQuery({
    queryKey: ["all-goals", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, description, category, level, minutes_per_day, deadline, time_slot_preference, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
  });

  useEffect(() => {
    if (allGoals && allGoals.length > 0 && !selectedGoalId) {
      const active = allGoals.find((g) => g.is_active) ?? allGoals[0];
      setSelectedGoalId(active.id);
    }
  }, [allGoals, selectedGoalId]);

  const activeGoal = allGoals?.find((g) => g.id === selectedGoalId) ?? allGoals?.[0];

  const { data } = useQuery({
    enabled: !!activeGoal?.id,
    queryKey: ["roadmap-full", activeGoal?.id],
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from("roadmap_modules")
        .select("id, title, description, estimated_minutes, ordinal")
        .eq("goal_id", activeGoal!.id)
        .order("ordinal", { ascending: true });
      if (error) throw error;
      const { data: topics, error: e2 } = await supabase
        .from("roadmap_topics")
        .select("id, title, module_id, ordinal, status, estimated_minutes, description")
        .eq("goal_id", activeGoal!.id)
        .order("ordinal", { ascending: true });
      if (e2) throw e2;
      return { modules, topics };
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      {/* Subject Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle mr-1">
            Subject Tracks:
          </span>
          {allGoals?.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGoalId(g.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                g.id === activeGoal?.id
                  ? "bg-ink text-background shadow-sm"
                  : "bg-surface text-ink-muted hover:border-ink/40 border border-border"
              }`}
            >
              <span>{g.title}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Subject Track
        </button>
      </div>

      <CreateTrackModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={(newGoalId) => setSelectedGoalId(newGoalId)}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-subtle">Syllabus & Roadmap</p>
          <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">
            {activeGoal?.title ?? "Your journey"}
          </h1>
          {activeGoal?.description && (
            <p className="mt-3 max-w-2xl text-ink-muted">{activeGoal.description}</p>
          )}
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs text-ink-muted transition hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> Add another subject
        </button>
      </div>

      {!activeGoal && (
        <div className="mt-10 surface-card p-8 text-center">
          <Target className="mx-auto h-6 w-6 text-ink-muted" />
          <p className="mt-3 text-ink-muted">No active subject tracks yet.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background"
          >
            Create a subject track
          </button>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { askTutor } from "@/lib/ai.functions";
import { logActivity } from "@/lib/progress.functions";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  X, Play, Pause, RotateCcw, Sparkles, FileText, ListChecks, BookOpen,
  Send, Loader2, CheckCircle2, Video, PenLine,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/focus/$topicId")({
  head: () => ({
    meta: [
      { title: "Focus Session — StudyVerse" },
      {
        name: "description",
        content:
          "A distraction-free focus workspace with a session timer, notes, tasks and an AI tutor for the topic you're studying.",
      },
      { property: "og:title", content: "Focus Session — StudyVerse" },
      {
        property: "og:description",
        content: "Deep-work mode: timer, notes, tasks and an AI tutor in one distraction-free view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FocusWorkspace,
});


type Resource = { kind: string; title: string; note?: string };

function FocusWorkspace() {
  const { topicId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"tutor" | "notes" | "tasks" | "resources">("tutor");
  const [tasks, setTasks] = useState<Record<string, boolean>>({
    "Watch lecture / read intro": false,
    "Take notes on key concepts": false,
    "Ask the tutor 1 question": false,
    "Complete quick self-check": false,
  });

  const { data: topic } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_topics")
        .select("id, title, description, estimated_minutes, key_concepts, resources, status, goal_id, goals(title)")
        .eq("id", topicId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: noteRow } = useQuery({
    queryKey: ["note", user.id, topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("topic_id", topicId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [noteText, setNoteText] = useState("");
  useEffect(() => {
    if (noteRow) setNoteText(noteRow.content);
  }, [noteRow]);

  // Auto-save notes (debounced)
  useEffect(() => {
    if (!noteRow && !noteText) return;
    const t = setTimeout(async () => {
      await supabase.from("notes").upsert(
        { user_id: user.id, topic_id: topicId, content: noteText },
        { onConflict: "user_id,topic_id" },
      );
    }, 800);
    return () => clearTimeout(t);
  }, [noteText, topicId, user.id, noteRow]);

  const log = useServerFn(logActivity);
  const loggedRef = useRef(false);

  /** Persists the elapsed session once: study_sessions row + today's activity rollup. */
  const saveSession = useCallback(
    async (topicsCompleted: number) => {
      if (loggedRef.current) return;
      loggedRef.current = true;
      const minutes = Math.max(0, Math.round(elapsedRef.current / 60));
      if (minutes === 0 && topicsCompleted === 0) return;
      try {
        if (topic?.goal_id) {
          await supabase.from("study_sessions").insert({
            user_id: user.id,
            goal_id: topic.goal_id,
            topic_id: topicId,
            minutes,
            ended_at: new Date().toISOString(),
          });
        }
        await log({ data: { minutes, topicsCompleted } });
      } catch {
        /* never block leaving focus mode */
      }
    },
    [log, topic?.goal_id, topicId, user.id],
  );

  async function exitFullscreen() {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
  }

  async function markComplete() {
    await supabase
      .from("roadmap_topics")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", topicId);
    await saveSession(1);
    qc.invalidateQueries();
    await exitFullscreen();
    navigate({ to: "/dashboard" });
  }

  async function exitFocus() {
    await saveSession(0);
    qc.invalidateQueries();
    await exitFullscreen();
    navigate({ to: "/dashboard" });
  }


  // Enter fullscreen on mount, exit on unmount
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => { /* user gesture may be required */ });
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => { /* ignore */ });
      }
    };
  }, []);

  // Timer
  const [running, setRunning] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((v) => {
        elapsedRef.current = v + 1;
        return v + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const resources = (topic?.resources as Resource[]) ?? [];
  const concepts = (topic?.key_concepts as string[]) ?? [];
  const goalTitle = (topic as unknown as { goals?: { title: string } })?.goals?.title;

  return (
    <div className="flex h-screen flex-col bg-background text-ink">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-subtle">{goalTitle}</p>
          <h1 className="truncate text-sm font-medium text-ink">
            {topic?.title ?? "Loading…"}
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
          <span className="tabular-nums text-ink">{fmt(elapsed)}</span>
          <span className="h-3 w-px bg-border" />
          <button
            onClick={() => setRunning((r) => !r)}
            className="text-ink-muted transition hover:text-ink"
            aria-label={running ? "Pause" : "Play"}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              setElapsed(0);
              elapsedRef.current = 0;
            }}
            className="text-ink-muted transition hover:text-ink"
            aria-label="Reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markComplete}
            className="hidden items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90 sm:inline-flex"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:bg-surface-strong hover:text-ink"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </Link>
        </div>
      </header>

      {/* Main split */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.6fr_1fr]">
        {/* Left: primary learning area */}
        <section className="min-h-0 overflow-auto border-b border-border md:border-b-0 md:border-r">
          <div className="mx-auto max-w-2xl px-8 py-10">
            <p className="text-xs uppercase tracking-widest text-ink-subtle">Now studying</p>
            <h2 className="mt-2 font-display text-4xl text-ink">{topic?.title}</h2>
            <p className="mt-3 text-ink-muted">{topic?.description}</p>

            <div className="mt-8 flex aspect-video items-center justify-center rounded-2xl border border-border bg-ink text-background">
              <div className="text-center">
                <Video className="mx-auto h-8 w-8 opacity-60" />
                <p className="mt-3 text-sm opacity-80">Lecture / reading area</p>
                <p className="mt-1 text-xs opacity-60">
                  Attach a video, PDF, or your own material here.
                </p>
              </div>
            </div>

            {concepts.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-ink">Key concepts</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {concepts.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink-muted"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={markComplete}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 sm:hidden"
            >
              Mark complete <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Right: Smart Study Panel */}
        <aside className="flex min-h-0 flex-col bg-surface">
          <div className="flex shrink-0 border-b border-border">
            <TabBtn label="Tutor" icon={Sparkles} active={tab === "tutor"} onClick={() => setTab("tutor")} />
            <TabBtn label="Notes" icon={PenLine} active={tab === "notes"} onClick={() => setTab("notes")} />
            <TabBtn label="Tasks" icon={ListChecks} active={tab === "tasks"} onClick={() => setTab("tasks")} />
            <TabBtn label="Resources" icon={BookOpen} active={tab === "resources"} onClick={() => setTab("resources")} />
          </div>

          {tab === "tutor" && <TutorPanel topicId={topicId} />}
          {tab === "notes" && (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <div className="flex items-center justify-between pb-2 text-xs text-ink-subtle">
                <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Auto-saving</span>
                <span>{noteText.length} chars</span>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Take notes as you learn. Markdown supported."
                className="flex-1 resize-none rounded-2xl border border-border bg-background p-4 font-mono text-sm text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              />
            </div>
          )}
          {tab === "tasks" && (
            <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
              {Object.entries(tasks).map(([task, done]) => (
                <label
                  key={task}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={(e) => setTasks({ ...tasks, [task]: e.target.checked })}
                    className="h-4 w-4 accent-ink"
                  />
                  <span className={done ? "text-ink-subtle line-through" : "text-ink"}>{task}</span>
                </label>
              ))}
            </div>
          )}
          {tab === "resources" && (
            <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
              {resources.length === 0 && (
                <p className="text-sm text-ink-muted">No resources yet for this topic.</p>
              )}
              {resources.map((r, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] uppercase tracking-widest text-ink-muted">
                      {r.kind}
                    </span>
                    <span className="text-sm font-medium text-ink">{r.title}</span>
                  </div>
                  {r.note && <p className="mt-1 text-xs text-ink-muted">{r.note}</p>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

function TutorPanel({ topicId }: { topicId: string }) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hey — I'm your tutor for this topic. Ask anything, or say 'explain this simply' and I'll break it down.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const question = input.trim();
    if (!question) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await ask({ data: { topicId, question } });
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tutor unavailable";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-ink text-background"
                  : "border border-border bg-background text-ink"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-border bg-background p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask the tutor…"
          className="max-h-32 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-background transition hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

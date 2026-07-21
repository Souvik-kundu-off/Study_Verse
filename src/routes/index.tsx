import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles, Focus, BookOpen, Brain, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSignedIn(!!s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-background">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-xl">StudyVerse</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <a href="#features" className="transition hover:text-ink">Features</a>
          <a href="#focus" className="transition hover:text-ink">Focus Mode</a>
          <a href="#how" className="transition hover:text-ink">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-ink-muted transition hover:text-ink">
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            AI Learning Operating System
          </div>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] text-ink md:text-7xl">
            Learn smarter.
            <br />
            <em className="text-ink-muted">Not harder.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-muted">
            Tell StudyVerse your goal. It builds your roadmap, schedules today's mission,
            and gives you a distraction-free workspace with an AI tutor that actually
            knows what you're studying.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={signedIn ? "/dashboard" : "/auth"}
              search={signedIn ? undefined : { mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              Start learning free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#focus"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-ink transition hover:bg-surface-strong"
            >
              See Focus Mode
            </a>
          </div>
        </div>

        {/* Hero visual: mock dashboard card */}
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="surface-card overflow-hidden shadow-[0_30px_80px_-30px_rgba(20,20,30,0.15)]">
            <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="ml-4 text-xs text-ink-subtle">studyverse.app / today</span>
            </div>
            <div className="grid gap-6 p-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-subtle">Today's mission</p>
                <h3 className="mt-2 font-display text-3xl text-ink">
                  Finish Linear Regression
                </h3>
                <p className="mt-1 text-sm text-ink-muted">62 minutes · Machine Learning</p>
                <div className="mt-6 space-y-2">
                  {[
                    "Watch Lecture 3 — Gradient Descent",
                    "Read AI-generated notes",
                    "Complete practice quiz",
                    "Revise Normalization",
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                      <span className={`h-4 w-4 rounded-full border ${i < 2 ? "border-brand bg-brand" : "border-border"}`} />
                      <span className={i < 2 ? "text-ink-subtle line-through" : "text-ink"}>
                        {t}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground">
                  Continue learning <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs text-ink-subtle">Streak</p>
                  <p className="mt-1 font-display text-2xl text-ink">12 days</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs text-ink-subtle">This week</p>
                  <p className="mt-1 font-display text-2xl text-ink">8h 42m</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs text-ink-subtle">Weak topic</p>
                  <p className="mt-1 text-sm text-ink">Backpropagation</p>
                  <p className="text-xs text-ink-muted">Scheduled for revision tomorrow</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-ink-subtle">Why StudyVerse</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
              Every study decision, made for you.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: Target,
                title: "Goals, not topics",
                body: "Say 'Crack Google SDE' or 'Pass DBMS'. StudyVerse turns it into modules, topics and daily missions.",
              },
              {
                icon: Brain,
                title: "AI tutor with context",
                body: "Your tutor sees your roadmap, notes and past quizzes. No more generic ChatGPT answers.",
              },
              {
                icon: Focus,
                title: "Focus Mode",
                body: "One screen. Video, notes, tutor, tasks and timer. No tabs, no distractions.",
              },
              {
                icon: BookOpen,
                title: "Notes that write themselves",
                body: "Auto-generated summaries from lectures. Highlight anything to expand or simplify.",
              },
              {
                icon: Sparkles,
                title: "Smart revision",
                body: "Weak topics resurface automatically. Your dashboard tells you exactly what to revise today.",
              },
              {
                icon: ArrowRight,
                title: "Always one click away",
                body: "Continue Learning picks up exactly where you left off. Every day.",
              },
            ].map((f, i) => (
              <div key={i} className="bg-background p-8">
                <f.icon className="h-5 w-5 text-brand" />
                <h3 className="mt-4 text-base font-medium text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus mode showcase */}
      <section id="focus" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-subtle">Focus mode</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
              A workspace built for long study sessions.
            </h2>
            <p className="mt-4 text-ink-muted">
              Watch the lecture. Read the PDF. Take notes. Ask the tutor.
              Complete the quiz. All in one calm, keyboard-driven surface —
              never a new tab.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Video, PDF or interactive lesson on the left",
                "Notes, AI tutor and resources on the right",
                "Pomodoro timer and focus score at the bottom",
                "Auto-save. Auto-summary. Auto-quiz.",
              ].map((s) => (
                <li key={s} className="flex items-start gap-2 text-ink">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="surface-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 text-xs text-ink-subtle">
              <span>Focus · Gradient Descent</span>
              <span>28:14</span>
            </div>
            <div className="grid grid-cols-[1.6fr_1fr]">
              <div className="aspect-video bg-ink" />
              <div className="border-l border-border p-4 text-xs text-ink-muted">
                <p className="font-medium text-ink">AI Notes</p>
                <p className="mt-3 leading-relaxed">
                  Gradient descent minimises a loss function by iteratively
                  moving in the direction of steepest descent, controlled by
                  the learning rate α…
                </p>
                <div className="mt-6 rounded-xl border border-border bg-surface p-3">
                  <p className="font-medium text-ink">Ask tutor</p>
                  <p className="mt-1 text-ink-subtle">Why is α too large a problem?</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-widest text-ink-subtle">How it works</p>
            <h2 className="mt-3 font-display text-4xl text-ink md:text-5xl">
              From goal to graduation in four steps.
            </h2>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Set a goal", "Pass the exam, crack the interview, master a skill."],
              ["02", "AI builds your roadmap", "Modules, topics, resources and daily missions."],
              ["03", "Enter Focus Mode", "One screen for everything. Zero distractions."],
              ["04", "Repeat daily", "Streaks, revision and analytics keep you on track."],
            ].map(([n, t, b]) => (
              <li key={n} className="rounded-2xl border border-border bg-background p-6">
                <p className="font-display text-3xl text-brand">{n}</p>
                <p className="mt-3 text-base font-medium text-ink">{t}</p>
                <p className="mt-1 text-sm text-ink-muted">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl text-ink md:text-6xl">
          Open StudyVerse.
          <br />
          <em className="text-ink-muted">Know exactly what to do next.</em>
        </h2>
        <div className="mt-8">
          <Link
            to={signedIn ? "/dashboard" : "/auth"}
            search={signedIn ? undefined : { mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            {signedIn ? "Open your dashboard" : "Start learning free"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-ink-subtle">
          <span>© {new Date().getFullYear()} StudyVerse</span>
          <span>Made for focused learners.</span>
        </div>
      </footer>
    </div>
  );
}

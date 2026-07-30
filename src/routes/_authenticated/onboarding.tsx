import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, GraduationCap, Compass, Loader2 } from "lucide-react";
import { generateRoadmap } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set Your Learning Goal — StudyVerse" },
      {
        name: "description",
        content:
          "Tell StudyVerse what you want to achieve and how much time you have, and get a personalized AI study roadmap.",
      },
      { property: "og:title", content: "Set Your Learning Goal — StudyVerse" },
      {
        property: "og:description",
        content: "Answer a few questions and get a personalized AI study roadmap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STYLES = ["Videos", "Reading", "Hands-on", "Mixed"];
const CATEGORIES = [
  "College Subjects",
  "Programming",
  "AI & Machine Learning",
  "Competitive Exams",
  "Languages",
  "Personal Skills",
  "Other",
];
const TIME_OPTIONS = [30, 60, 90, 120];

const EXAMPLE_GOALS = [
  "Crack Google SDE interview",
  "Pass DBMS semester exam",
  "Learn Python for AI",
  "Master Data Structures & Algorithms",
  "Prepare for GATE CSE",
  "Build a Netflix Clone",
];

type State = {
  goalTitle: string;
  description: string;
  category: string;
  level: (typeof LEVELS)[number];
  minutesPerDay: number;
  deadline: string;
  learningStyle: string;
  syllabusText: string;
  timeSlotPreference: "morning" | "afternoon" | "evening" | "night" | "flexible";
};

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const gen = useServerFn(generateRoadmap);
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [state, setState] = useState<State>({
    goalTitle: "",
    description: "",
    category: "",
    level: "beginner",
    minutesPerDay: 60,
    deadline: "",
    learningStyle: "Mixed",
    syllabusText: "",
    timeSlotPreference: "flexible",
  });

  const steps = ["Goal", "Category", "Level", "Time", "Style", "Syllabus"];

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await gen({
        data: {
          goalTitle: state.goalTitle.trim(),
          description: state.description.trim() || undefined,
          category: state.category || undefined,
          level: state.level,
          minutesPerDay: state.minutesPerDay,
          deadline: state.deadline || null,
          learningStyle: state.learningStyle,
          syllabusText: state.syllabusText.trim() || undefined,
          timeSlotPreference: state.timeSlotPreference,
        },
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Your roadmap is ready.");
      navigate({ to: "/dashboard", search: { newGoal: res.goalId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
    }
  }

  if (generating) return <GeneratingScreen />;

  const canNext = () => {
    if (step === 0) return state.goalTitle.trim().length >= 2;
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6">
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-ink text-background">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-lg text-ink">StudyVerse</span>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i <= step ? "w-6 bg-ink" : "w-3 bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {step === 0 && (
            <StepShell
              eyebrow="Step 1 of 5"
              title="What do you want to achieve?"
              subtitle="Set one clear goal. Something that would matter if you finished it."
            >
              <input
                autoFocus
                value={state.goalTitle}
                onChange={(e) => setState({ ...state, goalTitle: e.target.value })}
                placeholder="e.g. Crack Google SDE interview"
                className="w-full rounded-2xl border border-border bg-background px-4 py-4 font-display text-2xl text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {EXAMPLE_GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setState({ ...state, goalTitle: g })}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-muted transition hover:border-ink hover:text-ink"
                  >
                    {g}
                  </button>
                ))}
              </div>
              <textarea
                value={state.description}
                onChange={(e) => setState({ ...state, description: e.target.value })}
                placeholder="Optional: add extra context — syllabus, target company, exam board…"
                rows={3}
                className="mt-6 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              />
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              eyebrow="Step 2 of 5"
              title="What area is it in?"
              subtitle="Helps us pick better resources."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <ChoiceCard
                    key={c}
                    selected={state.category === c}
                    onClick={() => setState({ ...state, category: c })}
                    label={c}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              eyebrow="Step 3 of 5"
              title="Where are you starting from?"
              subtitle="Be honest. We'll adjust the pace."
            >
              <div className="grid gap-2">
                {LEVELS.map((l) => (
                  <ChoiceCard
                    key={l}
                    selected={state.level === l}
                    onClick={() => setState({ ...state, level: l })}
                    label={l.charAt(0).toUpperCase() + l.slice(1)}
                    description={
                      l === "beginner"
                        ? "Little to no prior experience"
                        : l === "intermediate"
                          ? "Some working knowledge"
                          : "Comfortable with fundamentals"
                    }
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              eyebrow="Step 4 of 5"
              title="How much time can you give daily?"
              subtitle="We'll size each mission to fit."
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TIME_OPTIONS.map((m) => (
                  <ChoiceCard
                    key={m}
                    selected={state.minutesPerDay === m}
                    onClick={() => setState({ ...state, minutesPerDay: m })}
                    label={`${m} min`}
                  />
                ))}
              </div>
              <div className="mt-8">
                <label className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={state.deadline}
                  onChange={(e) => setState({ ...state, deadline: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
                />
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              eyebrow="Step 5 of 6"
              title="How do you learn best?"
              subtitle="Your roadmap adapts to your style."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {STYLES.map((s) => (
                  <ChoiceCard
                    key={s}
                    selected={state.learningStyle === s}
                    onClick={() => setState({ ...state, learningStyle: s })}
                    label={s}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell
              eyebrow="Step 6 of 6"
              title="Got a syllabus or study materials?"
              subtitle="Paste your curriculum or attach notes to ground your roadmap in exact topics (Optional)."
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Paste Syllabus or Chapter List
                  </label>
                  <textarea
                    value={state.syllabusText}
                    onChange={(e) => setState({ ...state, syllabusText: e.target.value })}
                    placeholder="e.g. Chapter 1: Newton's Laws, Chapter 2: Work & Energy, Chapter 3: Rotational Motion..."
                    rows={4}
                    className="mt-1.5 w-full rounded-2xl border border-border bg-background p-4 text-sm text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Preferred Daily Schedule Slot
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { id: "morning", label: "Morning 🌅" },
                      { id: "afternoon", label: "Afternoon ☀️" },
                      { id: "evening", label: "Evening 🌆" },
                      { id: "night", label: "Night 🌙" },
                      { id: "flexible", label: "Flexible ⚡" },
                    ].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setState({ ...state, timeSlotPreference: slot.id as any })}
                        className={`rounded-xl border p-3 text-center text-xs font-medium transition ${
                          state.timeSlotPreference === slot.id
                            ? "border-ink bg-surface-strong text-ink font-semibold"
                            : "border-border bg-background text-ink-muted hover:border-ink/40"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </StepShell>
          )}
        </div>

        <div className="flex items-center justify-between py-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-ink-muted transition hover:text-ink disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90"
            >
              Build my roadmap <Compass className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-ink-subtle">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">{title}</h1>
      <p className="mt-2 text-ink-muted">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-ink bg-surface-strong"
          : "border-border bg-background hover:border-ink/40"
      }`}
    >
      <div className="text-sm font-medium text-ink">{label}</div>
      {description && (
        <div className="mt-1 text-xs text-ink-muted">{description}</div>
      )}
    </button>
  );
}

function GeneratingScreen() {
  const messages = [
    "Analyzing your goal…",
    "Designing modules…",
    "Sequencing topics…",
    "Curating resources…",
    "Planning revision…",
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setI((v) => (v + 1) % messages.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-background">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="mt-6 font-display text-3xl text-ink">Building your roadmap</h2>
        <p className="mt-2 text-ink-muted">{messages[i]}</p>
        <p className="mt-8 text-xs text-ink-subtle">This usually takes 10–20 seconds.</p>
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { askTutor, generateQuizForTopic, generateFlashcardsForTopic, generateSmartNotes } from "@/lib/ai.functions";
import { logActivity } from "@/lib/progress.functions";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X, Play, Pause, RotateCcw, FileText, BookOpen, Bot,
  Send, Loader2, CheckCircle2, Video, PenLine, Layers, HelpCircle, Code2, Wand2, ExternalLink, RefreshCw, Maximize2, Minimize2, Save, Search, Download, Trash2, Upload
} from "lucide-react";
import { FlashcardDeck } from "@/components/study/FlashcardDeck";
import { QuizModal } from "@/components/study/QuizModal";
import { CodingPlayground } from "@/components/tools/CodingPlayground";
import { FormattedText } from "@/components/ui/FormattedText";
import { ingestDocument } from "@/lib/rag.server";

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

  const [tab, setTab] = useState<"tutor" | "notes" | "flashcards" | "quiz" | "playground" | "resources">("tutor");
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [docName, setDocName] = useState("");
  const [docText, setDocText] = useState("");
  const [ingesting, setIngesting] = useState(false);

  const genNotes = useServerFn(generateSmartNotes);
  const genQuiz = useServerFn(generateQuizForTopic);
  const genCards = useServerFn(generateFlashcardsForTopic);
  const ingestFn = useServerFn(ingestDocument);

  // Auto trigger fullscreen focus mode on lesson start
  useEffect(() => {
    if (!document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {});
      } catch {}
    }
  }, []);

  // Topic Details
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

  // Quizzes query
  const { data: quizData, refetch: refetchQuiz } = useQuery({
    queryKey: ["quiz", topicId],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("id, title, questions").eq("topic_id", topicId).maybeSingle();
      return data;
    },
  });

  // Flashcards query
  const { data: cardsData, refetch: refetchCards } = useQuery({
    queryKey: ["flashcards", topicId],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("id, front, back, box").eq("topic_id", topicId);
      return data ?? [];
    },
  });

  // Saved Notes Query (Personal notes & AI Lesson summary)
  const { data: noteRow } = useQuery({
    queryKey: ["note", user.id, topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, content, ai_summary")
        .eq("user_id", user.id)
        .eq("topic_id", topicId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [aiLessonGuide, setAiLessonGuide] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");

  useEffect(() => {
    if (noteRow?.ai_summary) {
      setAiLessonGuide(noteRow.ai_summary);
    }
    if (noteRow?.content) {
      setPersonalNotes(noteRow.content);
    }
  }, [noteRow]);

  // YouTube Video Search
  const [ytVideo, setYtVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [ytLoading, setYtLoading] = useState(false);

  useEffect(() => {
    if (!topic?.title) return;
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) return;

    setYtLoading(true);
    const query = `${topic.title} tutorial explanation`;
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`)
      .then((r) => r.json())
      .then((data) => {
        const item = data.items?.[0];
        if (item?.id?.videoId) {
          setYtVideo({ videoId: item.id.videoId, title: item.snippet?.title ?? topic.title });
        }
      })
      .catch(() => {})
      .finally(() => setYtLoading(false));
  }, [topic?.title]);

  // Auto-generate AI Lesson Notes on initial load if none exist yet
  useEffect(() => {
    if (!topic || aiLessonGuide || generatingNotes) return;
    handleAutoNotes();
  }, [topic, aiLessonGuide]);

  async function handleAutoNotes() {
    setGeneratingNotes(true);
    try {
      const res = await genNotes({ data: { topicId } });
      setAiLessonGuide(res.content);
      // Save AI lesson guide in ai_summary field
      await supabase.from("notes").upsert(
        { user_id: user.id, topic_id: topicId, ai_summary: res.content },
        { onConflict: "user_id,topic_id" }
      );
      qc.invalidateQueries({ queryKey: ["note", user.id, topicId] });
    } catch {
      /* handle error silently */
    } finally {
      setGeneratingNotes(false);
    }
  }

  // Trigger Quiz generation on tab switch if empty
  useEffect(() => {
    if (tab === "quiz" && !quizData && !generatingQuiz) {
      setGeneratingQuiz(true);
      genQuiz({ data: { topicId } })
        .then(() => refetchQuiz())
        .catch(() => {})
        .finally(() => setGeneratingQuiz(false));
    }
  }, [tab, quizData, generatingQuiz, topicId]);

  // Trigger Flashcards generation on tab switch if empty
  useEffect(() => {
    if (tab === "flashcards" && (!cardsData || cardsData.length === 0) && !generatingCards) {
      setGeneratingCards(true);
      genCards({ data: { topicId } })
        .then(() => refetchCards())
        .catch(() => {})
        .finally(() => setGeneratingCards(false));
    }
  }, [tab, cardsData, generatingCards, topicId]);

  const handleDownloadPersonalNotes = () => {
    if (!personalNotes.trim()) {
      toast.error("No personal notes to download.");
      return;
    }
    const blob = new Blob([personalNotes], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic?.title ?? "study"}-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded your personal notes!");
  };

  const handleClearPersonalNotes = async () => {
    if (!personalNotes) return;
    setPersonalNotes("");
    await supabase.from("notes").update({ content: "" }).eq("user_id", user.id).eq("topic_id", topicId);
    toast.success("Cleared personal notes.");
  };

  const log = useServerFn(logActivity);
  const loggedRef = useRef(false);

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
      {/* Top Bar */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-subtle">{goalTitle}</p>
          <h1 className="truncate text-sm font-medium text-ink">
            {topic?.title ?? "Loading Lesson…"}
          </h1>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
          <span className="tabular-nums font-mono text-ink">{fmt(elapsed)}</span>
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

        {/* Complete / Fullscreen / Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!document.fullscreenElement) {
                try { await document.documentElement.requestFullscreen(); } catch {}
              } else {
                try { await document.exitFullscreen(); } catch {}
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface-strong hover:text-ink"
            title="Toggle Distraction-Free Full Screen Focus Mode"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Focus Fullscreen</span>
          </button>
          <button
            onClick={markComplete}
            className="hidden items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-brand-foreground transition hover:opacity-90 sm:inline-flex"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
          </button>
          <button
            onClick={exitFocus}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:bg-surface-strong hover:text-ink"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </header>

      {/* Main split */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1.6fr_1fr]">
        {/* Left: Primary Lesson Area */}
        <section className="min-h-0 overflow-auto border-b border-border md:border-b-0 md:border-r p-6 md:p-10">
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-subtle">
                <span>Lesson</span>
                <span>•</span>
                <span>{topic?.estimated_minutes ?? 20} mins</span>
              </div>
              <h2 className="mt-2 font-display text-3xl md:text-4xl text-ink font-semibold">{topic?.title}</h2>
              <p className="mt-2 text-base text-ink-muted leading-relaxed">{topic?.description}</p>
            </div>

            {/* YouTube Video Section */}
            {ytLoading && (
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-border bg-surface text-ink-muted text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Finding best video tutorial…
              </div>
            )}

            {!ytLoading && ytVideo && (
              <div className="rounded-2xl border border-border overflow-hidden bg-black shadow-sm">
                <div className="flex items-center justify-between bg-surface px-4 py-2 text-xs border-b border-border">
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                    <Video className="h-3.5 w-3.5 text-red-500" /> YouTube Tutorial
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowVideo(!showVideo)}
                      className="text-ink-muted hover:text-ink underline"
                    >
                      {showVideo ? "Hide Video" : "Show Video"}
                    </button>
                    <a
                      href={`https://www.youtube.com/watch?v=${ytVideo.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-ink-muted hover:text-ink"
                    >
                      Watch on YouTube <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                {showVideo && (
                  <div className="aspect-video w-full">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytVideo.videoId}?autoplay=0`}
                      title={ytVideo.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {/* AI Generated Notes / Lesson Text */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="inline-flex items-center gap-2 font-display text-lg text-ink">
                  <BookOpen className="h-4 w-4 text-brand" /> Lesson Notes & Guide
                </h3>
                <button
                  onClick={handleAutoNotes}
                  disabled={generatingNotes}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${generatingNotes ? "animate-spin" : ""}`} />
                  {generatingNotes ? "Generating..." : "Regenerate"}
                </button>
              </div>

              {generatingNotes && (
                <div className="py-12 text-center text-sm text-ink-muted">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand mb-2" />
                  Generating custom structured notes for {topic?.title}…
                </div>
              )}

              {!generatingNotes && aiLessonGuide && (
                <FormattedText content={aiLessonGuide} className="mt-4" />
              )}

              {!generatingNotes && !aiLessonGuide && (
                <div className="py-8 text-center text-sm text-ink-muted">
                  <p>No lesson notes generated yet.</p>
                  <button
                    onClick={handleAutoNotes}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-foreground"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Generate Lesson Notes
                  </button>
                </div>
              )}
            </div>

            {/* Key Concepts */}
            {concepts.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-ink-subtle font-medium">Key Concepts to Master</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {concepts.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
                    >
                      🔑 {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Lesson CTA */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-ink-subtle">Finished reading and practicing?</span>
              <button
                onClick={markComplete}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 shadow-sm"
              >
                Mark complete <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Right: Interactive Study Panel */}
        <aside className="flex min-h-0 flex-col bg-surface">
          <div className="flex shrink-0 border-b border-border overflow-x-auto">
            <TabBtn label="Tutor" icon={Bot} active={tab === "tutor"} onClick={() => setTab("tutor")} />
            <TabBtn label="My Notes" icon={PenLine} active={tab === "notes"} onClick={() => setTab("notes")} />
            <TabBtn label="Quiz" icon={HelpCircle} active={tab === "quiz"} onClick={() => setTab("quiz")} />
            <TabBtn label="Cards" icon={Layers} active={tab === "flashcards"} onClick={() => setTab("flashcards")} />
            <TabBtn label="Sandbox" icon={Code2} active={tab === "playground"} onClick={() => setTab("playground")} />
            <TabBtn label="Resources" icon={BookOpen} active={tab === "resources"} onClick={() => setTab("resources")} />
          </div>

          {/* Tab 1: AI Tutor */}
          {tab === "tutor" && <TutorPanel topicId={topicId} />}

          {/* Tab 2: Personal Student Notes */}
          {tab === "notes" && (
            <div className="flex min-h-0 flex-1 flex-col p-4 space-y-3">
              <div className="flex items-center justify-between pb-1 text-xs text-ink-subtle">
                <span className="inline-flex items-center gap-1 font-medium">
                  <PenLine className="h-3.5 w-3.5 text-indigo-500" /> Student Personal Notebook
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDownloadPersonalNotes}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:text-ink transition"
                    title="Download notes to file"
                  >
                    <Download className="h-3 w-3" /> Export
                  </button>
                  {personalNotes && (
                    <button
                      onClick={handleClearPersonalNotes}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Clear personal notes"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await supabase.from("notes").upsert(
                        { user_id: user.id, topic_id: topicId, content: personalNotes },
                        { onConflict: "user_id,topic_id" }
                      );
                      toast.success("Saved personal notes!");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-background hover:opacity-90 transition shadow-sm"
                  >
                    <Save className="h-3 w-3" /> Save Notes
                  </button>
                </div>
              </div>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Type your own personal takeaways, formulas, or questions here to review later... (This notebook is private to you)"
                className="flex-1 resize-none rounded-2xl border border-border bg-background p-4 font-sans text-sm text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none"
              />
            </div>
          )}

          {/* Tab 3: Interactive Quiz */}
          {tab === "quiz" && (
            <QuizModal
              quiz={quizData as any}
              loading={generatingQuiz}
              onGenerate={async () => {
                setGeneratingQuiz(true);
                await genQuiz({ data: { topicId } });
                refetchQuiz();
                setGeneratingQuiz(false);
              }}
            />
          )}

          {/* Tab 4: Flashcards */}
          {tab === "flashcards" && (
            <FlashcardDeck
              cards={(cardsData as any) ?? []}
              loading={generatingCards}
              onGenerateMore={async () => {
                setGeneratingCards(true);
                await genCards({ data: { topicId } });
                refetchCards();
                setGeneratingCards(false);
              }}
            />
          )}

          {/* Tab 5: Coding Sandbox */}
          {tab === "playground" && <CodingPlayground />}

          {/* Tab 6: Clickable Interactive Resources & Grounded Material Upload */}
          {tab === "resources" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
              {/* Grounded Course Material Ingestion Box */}
              <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-indigo-200/50 dark:border-slate-800 pb-2">
                  <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    Add Grounded Textbook / PDF Notes
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Paste textbook excerpts, lecture slides, or documentation text below to generate 100% grounded flashcards & quizzes with page citations!
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Document Name (e.g. Chapter 3 Notes.pdf)"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-ink placeholder:text-ink-subtle focus:outline-none"
                  />
                  <textarea
                    rows={3}
                    placeholder="Paste textbook or lecture text here..."
                    value={docText}
                    onChange={(e) => setDocText(e.target.value)}
                    className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs text-ink placeholder:text-ink-subtle focus:outline-none"
                  />
                  <button
                    disabled={ingesting || !docText.trim() || !docName.trim()}
                    onClick={async () => {
                      setIngesting(true);
                      try {
                        const res = await ingestFn({
                          data: {
                            topicId,
                            goalId: topic?.goal_id ?? undefined,
                            documentName: docName.trim(),
                            rawText: docText.trim(),
                          },
                        });
                        toast.success(`Ingested ${res.chunksIngested} chunks from "${docName}"! RAG vector index ready.`);
                        setDocText("");
                        setDocName("");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Ingestion failed");
                      } finally {
                        setIngesting(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                  >
                    {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {ingesting ? "Indexing Chunks..." : "Ingest & Vector Index Material"}
                  </button>
                </div>
              </div>

              {resources.length === 0 && (
                <p className="text-sm text-ink-muted">No specific external resources listed for this topic.</p>
              )}
              {resources.map((r, i) => {
                const searchQuery = encodeURIComponent(`${topic?.title ?? ""} ${r.title}`);
                return (
                  <div key={i} className="rounded-xl border border-border bg-background p-3.5 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                          {r.kind}
                        </span>
                        <span className="text-sm font-semibold text-ink">{r.title}</span>
                      </div>
                    </div>
                    {r.note && <p className="text-xs text-ink-muted leading-relaxed">{r.note}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      <a
                        href={`https://www.youtube.com/results?search_query=${searchQuery}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-100 transition"
                      >
                        <Video className="w-3 h-3" /> YouTube
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${searchQuery}+documentation`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                      >
                        <Search className="w-3 h-3" /> Docs Search
                      </a>
                      <a
                        href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(r.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                      >
                        <BookOpen className="w-3 h-3" /> Wikipedia
                      </a>
                    </div>
                  </div>
                );
              })}
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
          ? "border-ink text-ink font-semibold"
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
      content: "Hey — I'm your tutor for this topic. Ask me any question, or say 'explain this simply' and I'll break it down.",
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
              className={`inline-block max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-ink text-background whitespace-pre-wrap"
                  : "border border-border bg-background text-ink shadow-sm text-left"
              }`}
            >
              {m.role === "user" ? (
                m.content
              ) : (
                <FormattedText content={m.content} />
              )}
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

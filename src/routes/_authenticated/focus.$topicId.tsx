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
  Send, Loader2, CheckCircle2, Video, PenLine, Layers, HelpCircle, Code2, Wand2, ExternalLink, RefreshCw, Maximize2, Minimize2, Save, Search, Download, Trash2, Upload, Columns, PanelLeft, PanelRight, Sparkles
} from "lucide-react";
import { FlashcardDeck } from "@/components/study/FlashcardDeck";
import { QuizModal } from "@/components/study/QuizModal";
import { CodingPlayground } from "@/components/tools/CodingPlayground";
import { FormattedText, MarkdownInline } from "@/components/ui/FormattedText";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [paneMode, setPaneMode] = useState<"split" | "video-only" | "workspace-only">("split");
  const [splitRatio, setSplitRatio] = useState<number>(60);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, newRatio));
      setSplitRatio(clamped);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

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

  // ── YouTube Smart Video Suggestion ───────────────────────────────────────
  type YtLang = "en" | "hi" | "any";
  type YtCandidate = { videoId: string; title: string; channelTitle: string };

  const [ytVideo, setYtVideo] = useState<{ videoId: string; title: string } | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytSkippedIds, setYtSkippedIds] = useState<string[]>([]);
  const [ytCandidates, setYtCandidates] = useState<YtCandidate[]>([]);
  const [ytLang, setYtLang] = useState<YtLang>("en");
  const [ytNoMore, setYtNoMore] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState<string | null>(null);

  const handleAskConcept = (concept: string) => {
    const question = `Can you explain the key concept "${concept}" in simple, intuitive terms with a clear real-world example?`;
    setTutorPrompt(question);
    setTab("tutor");
    if (paneMode === "video-only") {
      setPaneMode("split");
    }
    toast.info(`Asking Gemini Tutor about "${concept}"...`);
  };

  /**
   * Score a YouTube candidate for educational relevance.
   * Higher = better match. Negative = likely wrong language or off-topic.
   */
  const scoreCandidate = useCallback(
    (c: YtCandidate, topicKeywords: string[], lang: YtLang): number => {
      let score = 0;
      const titleLower = c.title.toLowerCase();
      const channelLower = c.channelTitle.toLowerCase();

      // +3 for each topic keyword found in title
      for (const kw of topicKeywords) {
        if (titleLower.includes(kw)) score += 3;
      }

      // +2 educational channel signals
      const eduChannelSignals = ["tutorial", "academy", "university", "edu", "lecture", "course", "learn", "institute", "cs", "mit", "nptel", "free"];
      for (const s of eduChannelSignals) {
        if (channelLower.includes(s)) { score += 2; break; }
      }

      // −5 for off-topic interview / podcast / non-tutorial patterns
      const offTopicPatterns = [
        "mock interview", "system design interview", "google employee", "amazon employee",
        "meta employee", "microsoft employee", "ftx", "podcast", "vlog", "unboxing",
        "salary", "career advice", "how i got", "my journey", "day in the life",
        "coding interview at", "got hired", "rejected by",
      ];
      for (const p of offTopicPatterns) {
        if (titleLower.includes(p)) { score -= 5; break; }
      }

      // Language penalty / bonus
      const foreignLangSignals = [
        "tamil", "telugu", "malayalam", "kannada", "bangla", "bengali",
        "marathi", "punjabi", "gujarati", "urdu", "|| tamil", "|| telugu",
        "in tamil", "in telugu", "in malayalam",
      ];
      const hindiSignals = ["hindi", "in hindi", "हिंदी", "|| hindi"];

      if (lang === "en") {
        // Penalize foreign languages (we want English)
        for (const s of foreignLangSignals) {
          if (titleLower.includes(s)) { score -= 8; break; }
        }
        for (const s of hindiSignals) {
          if (titleLower.includes(s)) { score -= 6; break; }
        }
      } else if (lang === "hi") {
        // Prefer Hindi
        for (const s of hindiSignals) {
          if (titleLower.includes(s)) { score += 4; break; }
        }
        // Penalize other regional languages
        for (const s of foreignLangSignals) {
          if (titleLower.includes(s)) { score -= 8; break; }
        }
      }
      // lang === "any" → no language scoring

      return score;
    },
    []
  );

  /**
   * Fetch candidates from YouTube and pick the best non-skipped one.
   * Pass skipIds to exclude already-seen videos.
   */
  const fetchYtVideo = useCallback(
    async (skipIds: string[], lang: YtLang, existingCandidates?: YtCandidate[]) => {
      if (!topic?.title) return;
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) return;

      setYtLoading(true);
      setYtNoMore(false);

      try {
        // Build the topic keywords list for scoring
        const goalTitle = (topic as any)?.goals?.title ?? "";
        let cleanBase = "";
        if (goalTitle && !topic.title.toLowerCase().includes(goalTitle.toLowerCase())) {
          cleanBase = `${goalTitle} ${topic.title}`;
        } else {
          cleanBase = topic.title;
        }
        cleanBase = cleanBase
          .replace(/\bworkout\b/gi, "problems solution")
          .replace(/\bexercise\b/gi, "practice problems")
          .replace(/\bexercises\b/gi, "practice problems");

        const topicKeywords = cleanBase
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);

        let candidates: YtCandidate[] = existingCandidates ?? [];

        // If we have exhausted existing candidates, fetch a fresh batch
        if (candidates.filter((c) => !skipIds.includes(c.videoId)).length === 0) {
          const langParam = lang !== "any" ? `&relevanceLanguage=${lang}` : "";
          const query = `${cleanBase} explained tutorial`;
          const url =
            `https://www.googleapis.com/youtube/v3/search?part=snippet` +
            `&maxResults=8&q=${encodeURIComponent(query)}` +
            `&type=video&videoCategoryId=27` +
            `&videoEmbeddable=true&videoDuration=medium` +
            langParam +
            `&key=${apiKey}`;

          const res = await fetch(url);
          const data = await res.json();

          const fresh: YtCandidate[] = (data.items ?? []).map((item: any) => ({
            videoId: item.id?.videoId ?? "",
            title: item.snippet?.title ?? topic.title,
            channelTitle: item.snippet?.channelTitle ?? "",
          })).filter((c: YtCandidate) => c.videoId);

          candidates = fresh;
          setYtCandidates(fresh);
        }

        // Filter out skipped, score the rest, pick best
        const available = candidates.filter((c) => !skipIds.includes(c.videoId));
        if (available.length === 0) {
          setYtNoMore(true);
          setYtLoading(false);
          return;
        }

        const scored = available
          .map((c) => ({ ...c, score: scoreCandidate(c, topicKeywords, lang) }))
          .sort((a, b) => b.score - a.score);

        const best = scored[0];
        setYtVideo({ videoId: best.videoId, title: best.title });
      } catch {
        /* silently fail */
      } finally {
        setYtLoading(false);
      }
    },
    [topic, scoreCandidate]
  );

  /** Called when user clicks "Suggest another" */
  const handleSuggestAnother = () => {
    if (!ytVideo) return;
    const newSkipped = [...ytSkippedIds, ytVideo.videoId];
    setYtSkippedIds(newSkipped);
    setYtVideo(null);
    toast.info("Finding a better match…");
    fetchYtVideo(newSkipped, ytLang, ytCandidates);
  };

  /** Refetch when language preference changes */
  const handleLangChange = (lang: YtLang) => {
    setYtLang(lang);
    setYtSkippedIds([]);
    setYtCandidates([]);
    setYtVideo(null);
    fetchYtVideo([], lang);
  };

  // Initial fetch on topic load
  useEffect(() => {
    fetchYtVideo([], ytLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.title, (topic as any)?.goals?.title]);

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

  const targetMinutes = topic?.estimated_minutes ?? 25;
  const targetSeconds = targetMinutes * 60;
  const timerProgressPct = Math.min(100, Math.round((elapsed / targetSeconds) * 100));

  return (
    <div className="flex h-screen flex-col bg-background text-slate-900">
      {/* Top Bar */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-slate-200 bg-white/95 px-6 py-2.5 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">{goalTitle || "StudyVerse Focus"}</p>
          <h1 className="truncate text-sm font-bold text-slate-900">
            {topic?.title ?? "Loading Lesson…"}
          </h1>
        </div>

        {/* Timer & View Controls */}
        <div className="flex items-center gap-3">
          {/* View Split Mode Switcher */}
          <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1">
            <button
              onClick={() => setPaneMode("video-only")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                paneMode === "video-only" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Lesson Video Only"
            >
              <PanelLeft className="h-3.5 w-3.5" />
              <span>Lesson</span>
            </button>
            <button
              onClick={() => setPaneMode("split")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                paneMode === "split" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setPaneMode("workspace-only")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                paneMode === "workspace-only" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="AI Workspace Only"
            >
              <PanelRight className="h-3.5 w-3.5" />
              <span>Workspace</span>
            </button>
          </div>

          {/* Pomodoro Timer Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <span className="tabular-nums font-mono text-slate-900">{fmt(elapsed)}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded-md ${
              running ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
            }`}>
              {running ? "Focusing" : "Paused"}
            </span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="text-slate-500 transition hover:text-slate-900"
              aria-label={running ? "Pause" : "Play"}
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => {
                setElapsed(0);
                elapsedRef.current = 0;
              }}
              className="text-slate-500 transition hover:text-slate-900"
              aria-label="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            title="Toggle Distraction-Free Full Screen Focus Mode"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <button
            onClick={markComplete}
            className="hidden items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 sm:inline-flex"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark complete
          </button>
          <button
            onClick={exitFocus}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </header>

      {/* Sleek Pomodoro Focus Progress Bar */}
      <div className="h-1 w-full bg-slate-100 relative overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${timerProgressPct}%` }}
        />
      </div>

      {/* Main split with Draggable Slider */}
      <div
        ref={containerRef}
        className={`min-h-0 flex-1 relative flex flex-col md:flex-row ${
          isDragging ? "select-none" : ""
        }`}
      >
        {/* Left: Primary Lesson Area */}
        {paneMode !== "workspace-only" && (
          <section
            style={{ width: paneMode === "split" ? `${splitRatio}%` : "100%" }}
            className={`min-h-0 overflow-auto border-b border-slate-200 md:border-b-0 p-6 md:p-10 transition-all duration-75 ${
              paneMode === "split" ? "" : "max-w-4xl mx-auto"
            }`}
          >
            <div className="mx-auto max-w-2xl space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Lesson</span>
                  <span>•</span>
                  <span>{targetMinutes} mins</span>
                </div>
                <h2 className="mt-2 font-display text-3xl md:text-4xl text-slate-900 font-extrabold">{topic?.title}</h2>
                <p className="mt-2 text-base text-slate-700 leading-relaxed font-normal"><MarkdownInline text={topic?.description} /></p>
              </div>

              {/* YouTube Video Section with Skeleton Loading */}
              {ytLoading && (
                <div className="space-y-2">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <p className="text-center text-xs font-medium text-slate-500 animate-pulse">Finding the best video match…</p>
                </div>
              )}

              {!ytLoading && ytVideo && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* Header bar */}
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200 gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Video className="h-3.5 w-3.5 text-red-500" /> YouTube Tutorial
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Language preference selector */}
                      <select
                        id="yt-lang-select"
                        value={ytLang}
                        onChange={(e) => handleLangChange(e.target.value as "en" | "hi" | "any")}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                        title="Preferred video language"
                      >
                        <option value="en">🇬🇧 English</option>
                        <option value="hi">🇮🇳 Hindi</option>
                        <option value="any">🌐 Any language</option>
                      </select>

                      {/* Suggest another */}
                      <button
                        id="yt-suggest-another-btn"
                        onClick={handleSuggestAnother}
                        title="This video doesn't look right? Get another suggestion"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
                      >
                        <RefreshCw className="h-3 w-3" /> Suggest another
                      </button>

                      <button
                        onClick={() => setShowVideo(!showVideo)}
                        className="text-[11px] text-slate-500 font-medium hover:text-slate-900 underline"
                      >
                        {showVideo ? "Hide" : "Show"}
                      </button>

                      <a
                        href={`https://www.youtube.com/watch?v=${ytVideo.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium hover:text-slate-900"
                      >
                        <ExternalLink className="h-3 w-3" /> Open
                      </a>
                    </div>
                  </div>

                  {/* Video title preview */}
                  <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-1" title={ytVideo.title}>
                      {ytVideo.title}
                    </p>
                  </div>

                  {showVideo && (
                    <div className="aspect-video w-full bg-black">
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

              {/* No more suggestions fallback */}
              {!ytLoading && ytNoMore && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center space-y-2">
                  <p className="text-xs font-medium text-slate-500">No more video suggestions available.</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent((topic?.title ?? "") + " tutorial")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    <Video className="h-3 w-3" /> Search YouTube manually <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* AI Generated Notes / Lesson Text */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="inline-flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                    <BookOpen className="h-4 w-4 text-blue-600" /> Lesson Notes & Guide
                  </h3>
                  <button
                    onClick={handleAutoNotes}
                    disabled={generatingNotes}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${generatingNotes ? "animate-spin" : ""}`} />
                    {generatingNotes ? "Generating..." : "Regenerate"}
                  </button>
                </div>

                {generatingNotes && (
                  <div className="space-y-3 py-6">
                    <Skeleton className="h-5 w-2/3 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-5/6 rounded-lg" />
                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                    <p className="text-center text-xs font-medium text-slate-500 pt-2">Generating structured AI notes…</p>
                  </div>
                )}

              {!generatingNotes && aiLessonGuide && (
                <FormattedText content={aiLessonGuide} className="mt-4" />
              )}

              {!generatingNotes && !aiLessonGuide && (
                <div className="py-8 text-center text-sm text-slate-600">
                  <p>No lesson notes generated yet.</p>
                  <button
                    onClick={handleAutoNotes}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Generate Lesson Notes
                  </button>
                </div>
              )}
            </div>

            {/* Key Concepts */}
            {concepts.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-widest text-slate-600 font-bold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Key Concepts to Master
                  </h3>
                  <span className="text-[11px] text-blue-600 font-medium hidden sm:inline">Click concept to ask Gemini Tutor ✨</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {concepts.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleAskConcept(c)}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 hover:bg-blue-600 hover:text-white px-3.5 py-1.5 text-xs font-semibold text-blue-900 transition-all shadow-2xs hover:shadow-sm cursor-pointer hover:scale-102 active:scale-98"
                      title={`Click to ask Gemini Tutor to explain ${c}`}
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">🔑 {c}</span>
                      <span className="text-[10px] opacity-60 group-hover:opacity-100 font-mono">Ask Tutor →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Complete Lesson CTA */}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-600 font-medium">Finished reading and practicing?</span>
              <button
                onClick={markComplete}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-xs"
              >
                Mark complete <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* Resizable Slider Drag Handle */}
        {paneMode === "split" && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setSplitRatio(60)}
            className="hidden md:flex w-2.5 bg-slate-200/80 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize items-center justify-center group transition-colors select-none z-20 shrink-0"
            title="Drag left/right to resize panels (Double-click to reset 60/40)"
          >
            <div className="h-8 w-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* Right: Interactive Study Panel */}
        {paneMode !== "video-only" && (
          <aside
            style={{ width: paneMode === "split" ? `${100 - splitRatio}%` : "100%" }}
            className="flex min-h-0 flex-col bg-slate-50 border-l border-slate-200 transition-all duration-75"
          >
            <div className="flex shrink-0 border-b border-slate-200 bg-white overflow-x-auto">
              <TabBtn label="Tutor" icon={Bot} active={tab === "tutor"} onClick={() => setTab("tutor")} />
              <TabBtn label="My Notes" icon={PenLine} active={tab === "notes"} onClick={() => setTab("notes")} />
              <TabBtn label="Quiz" icon={HelpCircle} active={tab === "quiz"} onClick={() => setTab("quiz")} />
              <TabBtn label="Cards" icon={Layers} active={tab === "flashcards"} onClick={() => setTab("flashcards")} />
              <TabBtn label="Sandbox" icon={Code2} active={tab === "playground"} onClick={() => setTab("playground")} />
              <TabBtn label="Resources" icon={BookOpen} active={tab === "resources"} onClick={() => setTab("resources")} />
            </div>

            {/* Tab 1: AI Tutor */}
            {tab === "tutor" && <TutorPanel topicId={topicId} externalPrompt={tutorPrompt} />}

            {/* Tab 2: Personal Student Notes */}
            {tab === "notes" && (
              <div className="flex min-h-0 flex-1 flex-col p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <PenLine className="h-3.5 w-3.5 text-blue-600" /> Personal Notebook
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleDownloadPersonalNotes}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title="Download notes to file"
                    >
                      <Download className="h-3 w-3" /> Export
                    </button>
                    {personalNotes && (
                      <button
                        onClick={handleClearPersonalNotes}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
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
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
                    >
                      <Save className="h-3 w-3" /> Save Notes
                    </button>
                  </div>
                </div>
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Type your own personal takeaways, formulas, or questions here to review later... (This notebook is private to you)"
                  className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-4 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none shadow-xs"
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

            {/* Tab 6: Resources & RAG Vector Ingestion */}
            {tab === "resources" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* RAG Custom Material Ingestion Card */}
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Index Custom Study Material (RAG AI)
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Paste textbook extracts or slide notes to feed into the AI Tutor for instant RAG vector context retrieval during study.
                  </p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Document Name (e.g. Chapter 3 Notes.pdf)"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <textarea
                      rows={3}
                      placeholder="Paste textbook or lecture text here..."
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                    >
                      {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {ingesting ? "Indexing Chunks..." : "Ingest & Vector Index Material"}
                    </button>
                  </div>
                </div>

                {resources.length === 0 && (
                  <p className="text-sm text-slate-500">No specific external resources listed for this topic.</p>
                )}
                {resources.map((r, i) => {
                  const goalTitle = (topic as any)?.goals?.title ?? "";
                  const cleanTitle = `${goalTitle} ${topic?.title ?? ""} ${r.title}`
                    .replace(/\bworkout\b/gi, "problems solution")
                    .replace(/\bexercise\b/gi, "practice problems")
                    .replace(/\bexercises\b/gi, "practice problems");
                  const searchQuery = encodeURIComponent(`${cleanTitle} lecture tutorial`);
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {r.kind}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{r.title}</span>
                        </div>
                      </div>
                      {r.note && <p className="text-xs text-slate-600 leading-relaxed">{r.note}</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <a
                          href={`https://www.youtube.com/results?search_query=${searchQuery}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 transition"
                        >
                          <Video className="w-3 h-3" /> YouTube
                        </a>
                        <a
                          href={`https://www.google.com/search?q=${searchQuery}+documentation`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <Search className="w-3 h-3" /> Docs Search
                        </a>
                        <a
                          href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(r.title)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition"
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
        )}
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

function TutorPanel({
  topicId,
  externalPrompt,
}: {
  topicId: string;
  externalPrompt?: string | null;
}) {
  const ask = useServerFn(askTutor);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hey — I'm your Gemini AI tutor for this topic. Ask me any question, or click any concept to break it down.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledPromptRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (externalPrompt && externalPrompt !== handledPromptRef.current) {
      handledPromptRef.current = externalPrompt;
      setMessages((m) => [...m, { role: "user", content: externalPrompt }]);
      setLoading(true);
      ask({ data: { topicId, question: externalPrompt } })
        .then((res) => {
          setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : "Tutor unavailable";
          setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
        })
        .finally(() => setLoading(false));
    }
  }, [externalPrompt, topicId, ask]);

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

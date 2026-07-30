import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Trophy, ArrowRight, RotateCcw } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Quiz = {
  id: string;
  title: string;
  questions: Question[];
};

export function QuizModal({
  quiz,
  onComplete,
  loading,
  onGenerate,
}: {
  quiz: Quiz | null;
  onComplete?: (scorePercentage: number) => void;
  loading?: boolean;
  onGenerate?: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm text-ink-muted">
        <Sparkles className="h-6 w-6 animate-spin text-brand mb-2" /> Generating adaptive quiz questions…
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-ink-muted">No quiz available for this topic yet.</p>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-foreground transition hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate AI Quiz
          </button>
        )}
      </div>
    );
  }

  const questions = quiz.questions;
  const current = questions[currentIdx];

  function handleSelect(optIdx: number) {
    if (answered) return;
    setSelectedOpt(optIdx);
    setAnswered(true);
    if (optIdx === current.correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOpt(null);
      setAnswered(false);
    } else {
      setCompleted(true);
      const pct = Math.round(((score + (selectedOpt === current.correctIndex ? 1 : 0)) / questions.length) * 100);
      onComplete?.(pct);
    }
  }

  function handleReset() {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
  }

  if (completed) {
    const finalPct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-display text-2xl text-ink">Quiz Completed!</h3>
        <p className="mt-1 text-sm text-ink-muted">
          You scored <span className="font-bold text-ink">{score}</span> out of {questions.length} ({finalPct}%)
        </p>
        {finalPct >= 75 ? (
          <p className="mt-2 text-xs text-brand font-medium">🎉 Great mastery! XP updated.</p>
        ) : (
          <p className="mt-2 text-xs text-ink-subtle">Review the notes and try again to improve your score.</p>
        )}
        <button
          onClick={handleReset}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-ink transition hover:bg-surface-strong"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-center justify-between text-xs text-ink-subtle pb-3">
        <span className="uppercase tracking-widest font-mono">
          Question {currentIdx + 1}/{questions.length}
        </span>
        <span>Score: {score}</span>
      </div>

      <h3 className="font-display text-base text-ink mb-4">{current.question}</h3>

      <div className="space-y-2 flex-1">
        {current.options.map((opt, i) => {
          let btnStyle = "border-border bg-background hover:border-ink/50 text-ink";
          if (answered) {
            if (i === current.correctIndex) {
              btnStyle = "border-emerald-500/50 bg-emerald-500/10 text-emerald-900 font-medium";
            } else if (i === selectedOpt) {
              btnStyle = "border-rose-500/50 bg-rose-500/10 text-rose-900";
            } else {
              btnStyle = "border-border/50 bg-background/50 text-ink-subtle opacity-60";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left rounded-xl border p-3 text-sm transition flex items-center justify-between ${btnStyle}`}
            >
              <span>{opt}</span>
              {answered && i === current.correctIndex && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {answered && i === selectedOpt && i !== current.correctIndex && (
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs text-ink-muted">
          <p className="font-medium text-ink mb-1">Explanation:</p>
          <p>{current.explanation}</p>
        </div>
      )}

      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background transition hover:opacity-90"
        >
          {currentIdx < questions.length - 1 ? "Next Question" : "See Final Score"} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Trophy, ArrowRight, RotateCcw, BrainCircuit, Sparkles, TrendingUp, History } from "lucide-react";
import { MarkdownInline } from "@/components/ui/FormattedText";

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

type PastAttempt = {
  score_percentage: number;
  completed_at: string;
};

export function QuizModal({
  quiz,
  onComplete,
  loading,
  onGenerate,
  onGenerateMore,
  generatingMore,
  pastAttempts = [],
}: {
  quiz: Quiz | null;
  onComplete?: (scorePercentage: number, userAnswers: Record<string, number>) => void;
  loading?: boolean;
  onGenerate?: () => void;
  onGenerateMore?: () => void;
  generatingMore?: boolean;
  pastAttempts?: PastAttempt[];
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  if (loading || generatingMore) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm text-slate-600">
        <BrainCircuit className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <p className="font-bold text-slate-900">
          {generatingMore ? "Generating fresh questions…" : "Generating adaptive quiz questions…"}
        </p>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">No quiz available for this topic yet.</p>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Generate Practice Quiz
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
    setUserAnswers((prev) => ({ ...prev, [String(currentIdx)]: optIdx }));
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
      const answerIdx = selectedOpt ?? -1;
      const finalScore = score + (answerIdx === current.correctIndex ? 1 : 0);
      const pct = Math.round((finalScore / questions.length) * 100);
      const finalAnswers = { ...userAnswers, [String(currentIdx)]: answerIdx };
      onComplete?.(pct, finalAnswers);
    }
  }

  function handleReset() {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setUserAnswers({});
  }

  function handleNewQuestions() {
    handleReset();
    onGenerateMore?.();
  }

  if (completed) {
    const finalScore = score;
    const finalPct = Math.round((finalScore / questions.length) * 100);

    // Compute stats from past attempts
    const allScores = pastAttempts.map((a) => a.score_percentage);
    const bestScore = allScores.length > 0 ? Math.max(...allScores) : null;
    const totalAttempts = allScores.length; // current attempt not yet in pastAttempts

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          <Trophy className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-extrabold text-slate-900">Quiz Completed!</h3>
        <p className="mt-1.5 text-sm font-semibold text-slate-700">
          You scored <strong className="text-slate-950">{finalScore}</strong> out of {questions.length} ({finalPct}%)
        </p>

        {finalPct >= 75 ? (
          <p className="mt-2 text-xs text-blue-700 font-bold">🎉 Great mastery! Score saved.</p>
        ) : (
          <p className="mt-2 text-xs text-slate-600 font-medium">Review the notes and try again to improve your score.</p>
        )}

        {/* Past Attempts Stats */}
        {(totalAttempts > 0 || bestScore !== null) && (
          <div className="mt-5 flex items-center justify-center gap-4">
            {bestScore !== null && (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Best: {bestScore}%</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <History className="h-3 w-3 text-slate-500" />
              <span className="font-medium text-slate-600">{totalAttempts + 1} attempt{totalAttempts > 0 ? "s" : ""}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
          </button>
          {onGenerateMore && (
            <button
              onClick={handleNewQuestions}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:from-blue-700 hover:to-indigo-700 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> New Questions
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIdx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-3">
        <span className="uppercase tracking-wider font-mono">
          Question {currentIdx + 1}/{questions.length}
        </span>
        <span>Score: {score}/{currentIdx + (answered ? 1 : 0)}</span>
      </div>

      <h4 className="font-bold text-base text-slate-900 leading-snug">
        <MarkdownInline text={current.question} />
      </h4>

      {/* Options */}
      <div className="space-y-2.5 pt-2">
        {current.options.map((opt, i) => {
          let btnStyle = "border-slate-200 bg-white hover:bg-slate-50 text-slate-800";
          if (answered) {
            if (i === current.correctIndex) {
              btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold";
            } else if (i === selectedOpt) {
              btnStyle = "border-rose-500 bg-rose-50 text-rose-950 font-semibold";
            } else {
              btnStyle = "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left rounded-xl border p-3.5 text-sm transition flex items-center justify-between cursor-pointer ${btnStyle}`}
            >
              <span><MarkdownInline text={opt} /></span>
              {answered && i === current.correctIndex && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {answered && i === selectedOpt && i !== current.correctIndex && (
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-slate-800 font-medium">
          <p className="font-extrabold text-blue-950 mb-1">Explanation:</p>
          <p className="text-slate-800 leading-relaxed"><MarkdownInline text={current.explanation} /></p>
        </div>
      )}

      {answered && (
        <button
          onClick={handleNext}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs cursor-pointer"
        >
          {currentIdx < questions.length - 1 ? "Next Question" : "See Final Score"} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

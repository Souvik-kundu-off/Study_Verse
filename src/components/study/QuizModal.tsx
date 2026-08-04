import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Trophy, ArrowRight, RotateCcw, BrainCircuit } from "lucide-react";

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
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm text-slate-600">
        <BrainCircuit className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <p className="font-bold text-slate-900">Generating adaptive quiz questions…</p>
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
        <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-700">
          <Trophy className="h-6 w-6" />
        </div>
        <h3 className="mt-3 font-display text-2xl font-extrabold text-slate-900">Quiz Completed!</h3>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          You scored <strong className="text-slate-950">{score}</strong> out of {questions.length} ({finalPct}%)
        </p>
        {finalPct >= 75 ? (
          <p className="mt-2 text-xs text-blue-700 font-bold">🎉 Great mastery! XP updated.</p>
        ) : (
          <p className="mt-2 text-xs text-slate-600 font-medium">Review the notes and try again to improve your score.</p>
        )}
        <button
          onClick={handleReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 shadow-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-3">
        <span className="uppercase tracking-wider font-mono">
          Question {currentIdx + 1}/{questions.length}
        </span>
        <span>Score: {score}</span>
      </div>

      <h3 className="font-display text-base font-extrabold text-slate-900 mb-4">{current.question}</h3>

      <div className="space-y-2.5 flex-1">
        {current.options.map((opt, i) => {
          let btnStyle = "border-slate-200 bg-white hover:border-blue-500 text-slate-900 font-bold";
          if (answered) {
            if (i === current.correctIndex) {
              btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
            } else if (i === selectedOpt) {
              btnStyle = "border-rose-400 bg-rose-50 text-rose-950 font-bold";
            } else {
              btnStyle = "border-slate-200 bg-slate-50 text-slate-500 opacity-60";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left rounded-xl border p-3.5 text-sm transition flex items-center justify-between cursor-pointer ${btnStyle}`}
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
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-slate-800 font-medium">
          <p className="font-extrabold text-blue-950 mb-1">Explanation:</p>
          <p className="text-slate-800 leading-relaxed">{current.explanation}</p>
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

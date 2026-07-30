import { useState } from "react";
import { RotateCw, Zap, ChevronRight, LayoutGrid, Layers, CheckCircle2, RefreshCw } from "lucide-react";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  box?: number;
};

export function FlashcardDeck({
  cards,
  onGenerateMore,
  loading,
}: {
  cards: Flashcard[];
  onGenerateMore?: () => void;
  loading?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [index, setIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [singleFlipped, setSingleFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const toggleCardFlip = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm text-ink-muted">
        <Zap className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
        <p className="font-semibold text-slate-900 dark:text-slate-100">Generating Flashcards…</p>
        <p className="text-xs text-slate-500 mt-1">Creating high-yield concept cards for quick active recall.</p>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Flashcards Built Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">Generate a deck of concept cards to test your retention.</p>
        {onGenerateMore && (
          <button
            onClick={onGenerateMore}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Zap className="h-3.5 w-3.5" /> Generate 5 Concept Cards
          </button>
        )}
      </div>
    );
  }

  const current = cards[index % cards.length];
  const isLast = index >= cards.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 space-y-4">
      {/* Top Controls: Mode Switcher & Progress */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md">
            {cards.length} Cards
          </span>
          <span>• {reviewedCount} reviewed</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === "grid"
                ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid View ({cards.length})
          </button>
          <button
            onClick={() => setViewMode("single")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              viewMode === "single"
                ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Focus Deck
          </button>
        </div>
      </div>

      {/* Mode 1: Multi-Card Grid View */}
      {viewMode === "grid" && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5">
            {cards.map((card, idx) => {
              const isFlipped = !!flippedCards[card.id];
              return (
                <div
                  key={card.id}
                  onClick={() => toggleCardFlip(card.id)}
                  className={`group relative flex flex-col justify-between min-h-[170px] cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 transform hover:-translate-y-1 shadow-md ${
                    isFlipped
                      ? "border-emerald-500/50 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 shadow-emerald-500/10"
                      : "border-indigo-500/40 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 shadow-indigo-500/10"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Card #{idx + 1}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isFlipped
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                    }`}>
                      {isFlipped ? "Answer" : "Question"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="my-3 font-semibold text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    {isFlipped ? card.back : card.front}
                  </div>

                  {/* Bottom Footer Indicator */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500">
                    <span className="text-xs">Click card to flip 🔄</span>
                    <RotateCw className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Single Focus Deck */}
      {viewMode === "single" && (
        <div className="flex min-h-0 flex-1 flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Card {index + 1} of {cards.length}</span>
            <span>Tap card to reveal answer</span>
          </div>

          <div
            onClick={() => setSingleFlipped(!singleFlipped)}
            className={`group relative flex flex-1 min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 p-8 text-center transition-all duration-300 shadow-xl ${
              singleFlipped
                ? "border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/50 shadow-emerald-500/10"
                : "border-indigo-500/50 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50 shadow-indigo-500/10"
            }`}
          >
            <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${
              singleFlipped ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            }`}>
              {singleFlipped ? "Answer" : "Question / Active Recall Prompt"}
            </span>

            <div className="font-bold text-lg md:text-xl text-slate-900 dark:text-slate-100 max-w-md leading-relaxed">
              {singleFlipped ? current.back : current.front}
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-slate-500 font-medium group-hover:text-indigo-600">
              <RotateCw className="h-4 w-4 text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
              <span>Flip</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setSingleFlipped(false);
                setIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
              }}
              className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Previous Card
            </button>

            <button
              onClick={() => {
                setSingleFlipped(false);
                setReviewedCount((c) => c + 1);
                if (isLast) {
                  setIndex(0);
                } else {
                  setIndex((i) => i + 1);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-md"
            >
              {isLast ? "Restart Deck" : "Next Card"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

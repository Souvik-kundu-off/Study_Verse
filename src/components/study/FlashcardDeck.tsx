import { useState } from "react";
import { RotateCw, Zap, ChevronRight, LayoutGrid, Layers } from "lucide-react";

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
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm text-slate-600">
        <Zap className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <p className="font-bold text-slate-900">Generating Flashcards…</p>
        <p className="text-xs text-slate-600 mt-1">Creating high-yield concept cards for quick active recall.</p>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">No Flashcards Built Yet</h4>
        <p className="text-xs text-slate-600 mt-1 max-w-xs">Generate a deck of concept cards to test your retention.</p>
        {onGenerateMore && (
          <button
            onClick={onGenerateMore}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
          >
            <Zap className="h-3.5 w-3.5" /> Generate Concept Cards
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
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-md">
            {cards.length} Cards
          </span>
          <span>• {reviewedCount} reviewed</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === "grid"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid View ({cards.length})
          </button>
          <button
            onClick={() => setViewMode("single")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === "single"
                ? "bg-white text-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card, idx) => {
              const isFlipped = !!flippedCards[card.id];
              return (
                <div
                  key={card.id}
                  onClick={() => toggleCardFlip(card.id)}
                  className={`group relative flex flex-col justify-between min-h-[170px] cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 transform hover:-translate-y-0.5 shadow-xs ${
                    isFlipped
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
                      : "border-blue-300 bg-gradient-to-br from-blue-50 via-white to-indigo-50"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      Card #{idx + 1}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isFlipped
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {isFlipped ? "Answer" : "Question"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="my-3 font-bold text-sm leading-relaxed text-slate-900">
                    {isFlipped ? card.back : card.front}
                  </div>

                  {/* Bottom Footer Indicator */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-semibold">
                    <span>Click card to flip 🔄</span>
                    <RotateCw className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-180 transition-transform duration-500" />
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
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Card {index + 1} of {cards.length}</span>
            <span>Tap card to reveal answer</span>
          </div>

          <div
            onClick={() => setSingleFlipped(!singleFlipped)}
            className={`group relative flex flex-1 min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 p-8 text-center transition-all duration-300 shadow-md ${
              singleFlipped
                ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
                : "border-blue-400 bg-gradient-to-br from-blue-50 via-white to-indigo-50"
            }`}
          >
            <span className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${
              singleFlipped ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
            }`}>
              {singleFlipped ? "Answer" : "Question / Active Recall Prompt"}
            </span>

            <div className="font-extrabold text-lg md:text-xl text-slate-900 max-w-md leading-relaxed">
              {singleFlipped ? current.back : current.front}
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs text-slate-600 font-semibold group-hover:text-blue-700">
              <RotateCw className="h-4 w-4 text-blue-600 group-hover:rotate-180 transition-transform duration-500" />
              <span>Flip</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setSingleFlipped(false);
                setIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs"
            >
              {isLast ? "Restart Deck" : "Next Card"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

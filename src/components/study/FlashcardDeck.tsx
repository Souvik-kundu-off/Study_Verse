import { useState } from "react";
import { RotateCw, Check, Sparkles, ChevronRight, RefreshCw } from "lucide-react";

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
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-ink-muted">
        <Sparkles className="mr-2 h-4 w-4 animate-spin text-brand" /> Generating flashcards…
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-ink-muted">No flashcards generated for this topic yet.</p>
        {onGenerateMore && (
          <button
            onClick={onGenerateMore}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background"
          >
            <Sparkles className="h-3.5 w-3.5" /> Create AI Flashcards
          </button>
        )}
      </div>
    );
  }

  const current = cards[index % cards.length];
  const isLast = index >= cards.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-center justify-between text-xs text-ink-subtle pb-2">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>{reviewedCount} reviewed</span>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="group relative flex min-h-[220px] flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-background p-6 text-center transition-all hover:border-ink/50"
      >
        <p className="text-xs uppercase tracking-widest text-ink-subtle mb-3">
          {flipped ? "Answer" : "Question / Concept"} (Click to flip)
        </p>

        <div className="font-display text-lg text-ink transition-all">
          {flipped ? current.back : current.front}
        </div>

        <div className="absolute bottom-3 right-3 text-ink-subtle transition group-hover:text-ink">
          <RotateCw className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
          }}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:bg-surface-strong hover:text-ink"
        >
          Previous
        </button>

        <button
          onClick={() => {
            setFlipped(false);
            setReviewedCount((c) => c + 1);
            if (isLast) {
              setIndex(0);
            } else {
              setIndex((i) => i + 1);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background transition hover:opacity-90"
        >
          {isLast ? "Restart Deck" : "Next Card"} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

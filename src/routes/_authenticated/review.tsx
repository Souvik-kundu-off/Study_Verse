import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getDueCards,
  reviewFlashcard,
  type DueCard,
  type ReviewGrade,
} from "@/lib/review.functions";
import { MarkdownInline } from "@/components/ui/FormattedText";
import { ArrowLeft, CheckCircle2, Layers, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Flashcard Review — StudyVerse" },
      {
        name: "description",
        content:
          "Review the flashcards that are due today. Your answers set the next review date, so nothing is repeated too soon.",
      },
      { property: "og:title", content: "Flashcard Review — StudyVerse" },
      {
        property: "og:description",
        content: "A spaced-repetition queue built from the cards you actually need to see today.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewSession,
});

const GRADES: Array<{ grade: ReviewGrade; label: string; hint: string; className: string }> = [
  {
    grade: "again",
    label: "Again",
    hint: "Back in 10 minutes",
    className: "border-rose-300 text-rose-700 hover:bg-rose-50",
  },
  {
    grade: "hard",
    label: "Hard",
    hint: "Same box, sooner",
    className: "border-amber-300 text-amber-700 hover:bg-amber-50",
  },
  {
    grade: "good",
    label: "Good",
    hint: "Next box",
    className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
  {
    grade: "easy",
    label: "Easy",
    hint: "Skip ahead",
    className: "border-sky-300 text-sky-700 hover:bg-sky-50",
  },
];

function ReviewSession() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const fetchDue = useServerFn(getDueCards);
  const submitReview = useServerFn(reviewFlashcard);

  const { data, isLoading } = useQuery({
    queryKey: ["due-cards", user.id],
    queryFn: () => fetchDue(),
  });

  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  // "Again" cards are re-appended so they come back before the session ends.
  const [repeated, setRepeated] = useState<DueCard[]>([]);

  const queue: DueCard[] = [...(data?.cards ?? []), ...repeated];
  const card = queue[pos];
  // `reviewed > 0` keeps the completion summary on screen: finishing the queue
  // invalidates the due list, which would otherwise swap the summary for the
  // "nothing due" empty state a moment later.
  const sessionDone = !isLoading && reviewed > 0 && pos >= queue.length;
  const nothingDue = !isLoading && reviewed === 0 && queue.length === 0;

  const reviewMutation = useMutation({
    mutationFn: (input: { flashcardId: string; grade: ReviewGrade }) =>
      submitReview({ data: input }),
    onError: (err: Error) => toast.error(err.message),
  });

  // Refresh the dashboard count once the queue is exhausted.
  useEffect(() => {
    if (sessionDone) {
      queryClient.invalidateQueries({ queryKey: ["due-cards", user.id] });
    }
  }, [sessionDone, queryClient, user.id]);

  const handleGrade = async (grade: ReviewGrade) => {
    if (!card || reviewMutation.isPending) return;

    try {
      await reviewMutation.mutateAsync({ flashcardId: card.id, grade });
    } catch {
      // onError already surfaced the message; keep the card on screen.
      return;
    }

    if (grade === "again") setRepeated((prev) => [...prev, { ...card, box: 1 }]);
    setReviewed((n) => n + 1);
    setRevealed(false);
    setPos((p) => p + 1);
  };

  const restart = () => {
    setPos(0);
    setRevealed(false);
    setReviewed(0);
    setRepeated([]);
    queryClient.invalidateQueries({ queryKey: ["due-cards", user.id] });
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6">
        <Loader2 className="h-6 w-6 animate-spin text-ink-subtle" />
      </main>
    );
  }

  const total = queue.length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 md:py-14">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Review</h1>
        {total > 0 && (
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            {Math.min(pos, total)} / {total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(Math.min(pos, total) / total) * 100}%` }}
          />
        </div>
      )}

      {nothingDue && (
        <div className="surface-card mt-8 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-4 font-display text-2xl text-ink">Nothing due right now</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {data && data.totalCards > 0
              ? "Every card is scheduled for a future date. Come back when the next one is due."
              : "Generate flashcards from a focus session and they will show up here."}
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-background hover:bg-ink/90 transition"
          >
            Back to today's mission
          </Link>
        </div>
      )}

      {sessionDone && (
        <div className="surface-card mt-8 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-4 font-display text-2xl text-ink">Queue cleared</h2>
          <p className="mt-2 text-sm text-ink-muted">
            You reviewed {reviewed} {reviewed === 1 ? "card" : "cards"}. Each one now has a real
            next review date instead of being permanently due.
          </p>
          <button
            onClick={restart}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-ink hover:bg-surface-strong transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Check for more due cards
          </button>
        </div>
      )}

      {card && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-ink-subtle">
            {card.topic_title && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                <Layers className="h-3 w-3" /> {card.topic_title}
              </span>
            )}
            <span className="rounded-full border border-border px-2.5 py-1">
              Box {card.box} of 5
            </span>
          </div>

          <div className="surface-card mt-4 min-h-[260px] p-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
              Prompt
            </p>
            <div className="mt-3 text-lg text-ink">
              <MarkdownInline text={card.front} />
            </div>

            {revealed && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-subtle">
                  Answer
                </p>
                <div className="mt-3 text-base text-ink-muted">
                  <MarkdownInline text={card.back} />
                </div>
              </div>
            )}
          </div>

          {revealed ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GRADES.map((option) => (
                <button
                  key={option.grade}
                  onClick={() => handleGrade(option.grade)}
                  disabled={reviewMutation.isPending}
                  className={`rounded-xl border bg-surface px-3 py-3 text-center transition disabled:opacity-60 ${option.className}`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] text-ink-subtle">{option.hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mt-5 w-full rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-background hover:bg-ink/90 transition"
            >
              Show answer
            </button>
          )}

          {reviewMutation.isPending && (
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-subtle">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving schedule…
            </p>
          )}
        </>
      )}
    </main>
  );
}

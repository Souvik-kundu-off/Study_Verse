import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Spaced repetition for flashcards.
 *
 * `flashcards.box` and `flashcards.next_review_at` existed from the first
 * migration but nothing ever wrote to them, so every card was permanently due
 * and the deck counted reviews in React state only — a refresh erased them.
 * These functions are the single place that decides the next review date, so
 * the schedule survives reloads and can be queried.
 *
 * The model is a Leitner box ladder with an SM-2 style ease factor:
 *  - Boxes 1..5 map to fixed base intervals.
 *  - "good"/"easy" advance a box and multiply the interval by ease.
 *  - "hard" stays in the box (re-show at the current interval).
 *  - "again" resets to box 1, counts a lapse and lowers ease.
 */

/** Base interval per box, in minutes. Index 0 is box 1. */
const BOX_INTERVALS_MINUTES = [10, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 21] as const;

const MIN_EASE = 1.3;
const MAX_EASE = 5.0;
/** Ease the migration set as the column default. */
const DEFAULT_EASE = 2.5;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type DueCard = {
  id: string;
  front: string;
  back: string;
  box: number;
  next_review_at: string;
  topic_id: string | null;
  topic_title: string | null;
};

export type DueCardsResult = {
  cards: DueCard[];
  /** Cards whose `next_review_at` has passed. */
  dueCount: number;
  /** Every card the user owns, due or not. */
  totalCards: number;
};

const MINUTE = 60 * 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function intervalForBox(box: number) {
  return BOX_INTERVALS_MINUTES[clamp(Math.round(box), 1, 5) - 1];
}

type Schedule = {
  box: number;
  ease: number;
  lapses: number;
  review_count: number;
  next_review_at: string;
  last_reviewed_at: string;
};

/** Pure schedule transition for one grade, so it is easy to reason about. */
export function nextSchedule(
  current: { box: number; ease: number | null; lapses: number; review_count: number },
  grade: ReviewGrade,
  now = new Date(),
): Schedule {
  const box = clamp(current.box ?? 1, 1, 5);
  const ease = current.ease ?? DEFAULT_EASE;

  let nextBox = box;
  let nextEase = ease;
  let days: number;
  let lapses = current.lapses;

  switch (grade) {
    case "again":
      nextBox = 1;
      nextEase = clamp(ease - 0.2, MIN_EASE, MAX_EASE);
      lapses += 1;
      days = intervalForBox(1) / (60 * 24);
      break;
    case "hard":
      nextBox = box;
      nextEase = clamp(ease - 0.05, MIN_EASE, MAX_EASE);
      days = intervalForBox(box) / (60 * 24);
      break;
    case "good":
      nextBox = clamp(box + 1, 1, 5);
      days = (intervalForBox(nextBox) / (60 * 24)) * ease;
      break;
    case "easy":
      nextBox = clamp(box + 2, 1, 5);
      nextEase = clamp(ease + 0.15, MIN_EASE, MAX_EASE);
      days = (intervalForBox(nextBox) / (60 * 24)) * ease;
      break;
  }

  // Guard against a zero/negative delay from a corrupted ease value.
  const delayMs = Math.max(days * 24 * 60 * MINUTE, 10 * MINUTE);

  return {
    box: nextBox,
    ease: Math.round(nextEase * 100) / 100,
    lapses,
    review_count: current.review_count + 1,
    next_review_at: new Date(now.getTime() + delayMs).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

/** Longest queue one session loads. The rest stay queued for the next round. */
const DUE_QUEUE_LIMIT = 50;

/**
 * Cards that are due right now, oldest due date first.
 *
 * Also reports total/due counts so the dashboard can show an honest number
 * without loading the queue itself.
 */
export const getDueCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DueCardsResult> => {
    const { supabase, userId } = context;
    const limit = DUE_QUEUE_LIMIT;
    const nowIso = new Date().toISOString();

    const { data: rows, error } = await supabase
      .from("flashcards")
      .select("id, front, back, box, next_review_at, topic_id")
      .eq("user_id", userId)
      .lte("next_review_at", nowIso)
      .order("next_review_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);

    const { count: totalCards, error: totalError } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (totalError) throw new Error(totalError.message);

    const dueRows = rows ?? [];

    // Separate count so a capped queue is not reported as the real total.
    const { count: dueCount, error: dueError } = await supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review_at", nowIso);
    if (dueError) throw new Error(dueError.message);

    // Topic titles give the review session context; one extra query beats
    // embedding the join in every row.
    const topicIds = [...new Set(dueRows.map((row) => row.topic_id).filter(Boolean))] as string[];
    const topicTitles = new Map<string, string>();

    if (topicIds.length > 0) {
      const { data: topics } = await supabase
        .from("roadmap_topics")
        .select("id, title")
        .in("id", topicIds);
      for (const topic of topics ?? []) topicTitles.set(topic.id, topic.title);
    }

    return {
      cards: dueRows.map((row) => ({
        id: row.id,
        front: row.front,
        back: row.back,
        box: row.box,
        next_review_at: row.next_review_at,
        topic_id: row.topic_id,
        topic_title: row.topic_id ? (topicTitles.get(row.topic_id) ?? null) : null,
      })),
      dueCount: dueCount ?? 0,
      totalCards: totalCards ?? 0,
    };
  });

const reviewInput = z.object({
  flashcardId: z.string().uuid(),
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export type ReviewResult = Schedule & { id: string };

/** Records one review and persists the next due date. */
export const reviewFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data, context }): Promise<ReviewResult> => {
    const { supabase, userId } = context;

    const { data: card, error: readError } = await supabase
      .from("flashcards")
      .select("id, box, ease, lapses, review_count")
      .eq("id", data.flashcardId)
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!card) throw new Error("Flashcard not found.");

    const schedule = nextSchedule(card, data.grade);

    const { error: writeError } = await supabase
      .from("flashcards")
      .update(schedule)
      .eq("id", card.id)
      .eq("user_id", userId);

    if (writeError) throw new Error(writeError.message);

    return { id: card.id, ...schedule };
  });

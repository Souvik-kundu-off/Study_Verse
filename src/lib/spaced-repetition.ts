/**
 * Spaced-repetition scheduling for flashcards — pure, dependency-free logic.
 *
 * This lives outside `review.functions.ts` so the transition rules can be unit
 * tested without booting the TanStack Start server runtime or Supabase. The
 * server functions in `review.functions.ts` own persistence; this module owns
 * the arithmetic and nothing else.
 *
 * The model is a Leitner box ladder with an SM-2 style ease factor:
 *  - Boxes 1..5 map to fixed base intervals.
 *  - "good"/"easy" advance a box and multiply the interval by ease.
 *  - "hard" stays in the box (re-show at the current interval).
 *  - "again" resets to box 1, counts a lapse and lowers ease.
 *
 * It is deliberately not FSRS-4.5: the boxes encode the interval ladder, ease
 * scales it, and there is no retrievability or stability model. Naming it
 * accurately matters more than matching the roadmap's prose.
 */

/** Base interval per box, in minutes. Index 0 is box 1. */
export const BOX_INTERVALS_MINUTES = [10, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 21] as const;

export const MIN_EASE = 1.3;
export const MAX_EASE = 5.0;
/** Ease the migration set as the column default. */
export const DEFAULT_EASE = 2.5;

/** Shortest delay any grade may produce; protects against corrupt ease values. */
export const MIN_DELAY_MINUTES = 10;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

const MINUTE = 60 * 1000;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function intervalForBox(box: number) {
  return BOX_INTERVALS_MINUTES[clamp(Math.round(box), 1, 5) - 1];
}

/** The mutable scheduling state of one card. */
export type CardScheduleState = {
  box: number;
  ease: number | null;
  lapses: number;
  review_count: number;
};

/** The state written back after one review. */
export type Schedule = CardScheduleState & {
  ease: number;
  next_review_at: string;
  last_reviewed_at: string;
};

/** Pure schedule transition for one grade, so it is easy to reason about. */
export function nextSchedule(
  current: CardScheduleState,
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
  const delayMs = Math.max(days * 24 * 60 * MINUTE, MIN_DELAY_MINUTES * MINUTE);

  return {
    box: nextBox,
    ease: Math.round(nextEase * 100) / 100,
    lapses,
    review_count: current.review_count + 1,
    next_review_at: new Date(now.getTime() + delayMs).toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

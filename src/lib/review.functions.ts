import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { nextSchedule, type ReviewGrade, type Schedule } from "@/lib/spaced-repetition";

/**
 * Persistence for the flashcard review loop.
 *
 * `flashcards.box` and `flashcards.next_review_at` existed from the first
 * migration but nothing ever wrote to them, so every card was permanently due
 * and the deck counted reviews in React state only — a refresh erased them.
 * These functions are the single place that decides the next review date, so
 * the schedule survives reloads and can be queried.
 *
 * The scheduling arithmetic itself lives in `spaced-repetition.ts` so it can
 * be unit tested without the server runtime.
 */

// Re-exported so existing imports of these names keep working.
export { nextSchedule };
export type { ReviewGrade, Schedule } from "@/lib/spaced-repetition";

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

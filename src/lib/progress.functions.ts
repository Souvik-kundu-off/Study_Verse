import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const logInput = z.object({
  minutes: z.number().int().min(0).max(1440).default(0),
  topicsCompleted: z.number().int().min(0).max(50).default(0),
});

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Adds minutes / completed topics to today's activity rollup for the signed-in user. */
export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => logInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const day = todayUTC();

    const { data: existing, error: readErr } = await supabase
      .from("daily_activity")
      .select("id, minutes, topics_completed")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    if (existing) {
      const { error } = await supabase
        .from("daily_activity")
        .update({
          minutes: existing.minutes + data.minutes,
          topics_completed: existing.topics_completed + data.topicsCompleted,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("daily_activity").insert({
        user_id: userId,
        day,
        minutes: data.minutes,
        topics_completed: data.topicsCompleted,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true, day };
  });

export type ProgressSummary = {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  totalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  days: Array<{ day: string; minutes: number; topics: number }>;
};

/** Streaks + 84-day activity history for the signed-in user. */
export const getProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressSummary> => {
    const { supabase, userId } = context;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 400);

    const { data: rows, error } = await supabase
      .from("daily_activity")
      .select("day, minutes, topics_completed")
      .eq("user_id", userId)
      .gte("day", dayKey(since))
      .order("day", { ascending: true });
    if (error) throw new Error(error.message);

    const byDay = new Map<string, { minutes: number; topics: number }>();
    for (const r of rows ?? []) {
      byDay.set(r.day, { minutes: r.minutes ?? 0, topics: r.topics_completed ?? 0 });
    }

    // Current streak: walk back from today (a missing today doesn't break yesterday's run).
    const cursor = new Date();
    let currentStreak = 0;
    const studiedToday = byDay.has(todayUTC());
    if (!studiedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (byDay.has(dayKey(cursor))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    // Longest streak across all recorded days.
    let longestStreak = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const r of rows ?? []) {
      const d = new Date(`${r.day}T00:00:00Z`);
      if (prev) {
        const gap = Math.round((d.getTime() - prev.getTime()) / 86_400_000);
        run = gap === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      longestStreak = Math.max(longestStreak, run);
      prev = d;
    }

    // Last 84 days grid (oldest → newest).
    const days: ProgressSummary["days"] = [];
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 83);
    for (let i = 0; i < 84; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = dayKey(d);
      const hit = byDay.get(key);
      days.push({ day: key, minutes: hit?.minutes ?? 0, topics: hit?.topics ?? 0 });
    }

    const totalMinutes = (rows ?? []).reduce((s, r) => s + (r.minutes ?? 0), 0);
    const todayMinutes = byDay.get(todayUTC())?.minutes ?? 0;
    const weekMinutes = days.slice(-7).reduce((s, d) => s + d.minutes, 0);

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      studiedToday,
      totalMinutes,
      todayMinutes,
      weekMinutes,
      days,
    };
  });

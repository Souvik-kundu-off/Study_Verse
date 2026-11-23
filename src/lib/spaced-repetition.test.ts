import { describe, expect, it } from "vitest";

import {
  BOX_INTERVALS_MINUTES,
  DEFAULT_EASE,
  MAX_EASE,
  MIN_DELAY_MINUTES,
  MIN_EASE,
  intervalForBox,
  nextSchedule,
  type CardScheduleState,
  type ReviewGrade,
} from "@/lib/spaced-repetition";

import {
  DEFAULT_MATCH_THRESHOLD,
  MAX_MATCH_THRESHOLD,
  MIN_MATCH_THRESHOLD,
  clampMatchThreshold,
} from "@/lib/rag-tuning";

const MINUTE_MS = 60 * 1000;

/** Fixed clock so every assertion is deterministic. */
const NOW = new Date("2026-01-15T09:00:00.000Z");

function state(overrides: Partial<CardScheduleState> = {}): CardScheduleState {
  return { box: 1, ease: DEFAULT_EASE, lapses: 0, review_count: 0, ...overrides };
}

/** Delay in minutes between the fixed clock and the produced due date. */
function delayMinutes(schedule: { next_review_at: string }): number {
  return (new Date(schedule.next_review_at).getTime() - NOW.getTime()) / MINUTE_MS;
}

const GRADES: ReviewGrade[] = ["again", "hard", "good", "easy"];

describe("intervalForBox", () => {
  it("returns the documented base interval for each box", () => {
    expect(intervalForBox(1)).toBe(10);
    expect(intervalForBox(2)).toBe(60 * 24);
    expect(intervalForBox(3)).toBe(60 * 24 * 3);
    expect(intervalForBox(4)).toBe(60 * 24 * 7);
    expect(intervalForBox(5)).toBe(60 * 24 * 21);
  });

  it("exposes the same ladder it indexes into", () => {
    expect([...BOX_INTERVALS_MINUTES]).toEqual([10, 1440, 4320, 10080, 30240]);
  });

  it("rounds fractional boxes to the nearest rung", () => {
    expect(intervalForBox(2.4)).toBe(1440);
    expect(intervalForBox(2.6)).toBe(4320);
  });

  it("clamps out-of-range boxes instead of returning undefined", () => {
    expect(intervalForBox(0)).toBe(10);
    expect(intervalForBox(-7)).toBe(10);
    expect(intervalForBox(99)).toBe(30240);
  });
});

describe("nextSchedule — grade × box matrix", () => {
  // `expected` is [nextBox, delayMinutes] for a card at default ease 2.5.
  const matrix: Record<ReviewGrade, Array<[number, number]>> = {
    //                box1     box2      box3       box4       box5
    again: [
      [1, 10],
      [1, 10],
      [1, 10],
      [1, 10],
      [1, 10],
    ],
    hard: [
      [1, 10],
      [2, 1440],
      [3, 4320],
      [4, 10080],
      [5, 30240],
    ],
    // "good" advances one box and scales the new interval by ease (2.5).
    good: [
      [2, 1440 * 2.5],
      [3, 4320 * 2.5],
      [4, 10080 * 2.5],
      [5, 30240 * 2.5],
      [5, 30240 * 2.5],
    ],
    // "easy" advances two boxes and scales by ease (2.5).
    easy: [
      [3, 4320 * 2.5],
      [4, 10080 * 2.5],
      [5, 30240 * 2.5],
      [5, 30240 * 2.5],
      [5, 30240 * 2.5],
    ],
  };

  for (const grade of GRADES) {
    for (let box = 1; box <= 5; box += 1) {
      const [expectedBox, expectedDelay] = matrix[grade][box - 1];

      it(`${grade} from box ${box} → box ${expectedBox}`, () => {
        const result = nextSchedule(state({ box }), grade, NOW);

        expect(result.box).toBe(expectedBox);
        expect(delayMinutes(result)).toBeCloseTo(expectedDelay, 6);
      });
    }
  }

  it("never leaves the box ladder", () => {
    for (const grade of GRADES) {
      for (let box = 1; box <= 5; box += 1) {
        const result = nextSchedule(state({ box }), grade, NOW);
        expect(result.box).toBeGreaterThanOrEqual(1);
        expect(result.box).toBeLessThanOrEqual(5);
      }
    }
  });

  it("always produces a strictly future due date", () => {
    for (const grade of GRADES) {
      for (let box = 1; box <= 5; box += 1) {
        const result = nextSchedule(state({ box }), grade, NOW);
        expect(new Date(result.next_review_at).getTime()).toBeGreaterThan(NOW.getTime());
      }
    }
  });
});

describe("nextSchedule — counters and ease", () => {
  it("increments review_count on every grade", () => {
    for (const grade of GRADES) {
      expect(nextSchedule(state({ review_count: 7 }), grade, NOW).review_count).toBe(8);
    }
  });

  it("counts a lapse only on 'again'", () => {
    expect(nextSchedule(state({ lapses: 0 }), "again", NOW).lapses).toBe(1);
    expect(nextSchedule(state({ lapses: 4 }), "again", NOW).lapses).toBe(5);

    for (const grade of ["hard", "good", "easy"] as const) {
      expect(nextSchedule(state({ lapses: 2 }), grade, NOW).lapses).toBe(2);
    }
  });

  it("resets a lapsed card to box 1 regardless of where it was", () => {
    for (let box = 1; box <= 5; box += 1) {
      expect(nextSchedule(state({ box: box, ease: 2.5 }), "again", NOW).box).toBe(1);
    }
  });

  it("lowers ease by 0.2 on 'again' and 0.05 on 'hard'", () => {
    expect(nextSchedule(state({ ease: 2.5 }), "again", NOW).ease).toBe(2.3);
    expect(nextSchedule(state({ ease: 2.5 }), "hard", NOW).ease).toBe(2.45);
  });

  it("raises ease by 0.15 on 'easy' and leaves it untouched on 'good'", () => {
    expect(nextSchedule(state({ ease: 2.5 }), "easy", NOW).ease).toBe(2.65);
    expect(nextSchedule(state({ ease: 2.5 }), "good", NOW).ease).toBe(2.5);
  });

  it("clamps ease at the lower bound instead of going negative", () => {
    const result = nextSchedule(state({ ease: MIN_EASE }), "again", NOW);
    expect(result.ease).toBe(MIN_EASE);
    expect(result.ease).toBeGreaterThan(0);
  });

  it("clamps ease at the upper bound instead of growing without limit", () => {
    const result = nextSchedule(state({ ease: MAX_EASE }), "easy", NOW);
    expect(result.ease).toBe(MAX_EASE);
  });

  it("rounds ease to two decimals so repeated reviews do not drift", () => {
    // 2.5 - 0.05 repeatedly would otherwise accumulate float noise.
    let current = state({ ease: 2.5 });
    for (let i = 0; i < 5; i += 1) {
      const next = nextSchedule(current, "hard", NOW);
      expect(next.ease).toBe(Number(next.ease.toFixed(2)));
      current = { ...current, ease: next.ease };
    }
    expect(current.ease).toBe(2.25);
  });

  it("treats a null ease as the migration default", () => {
    expect(nextSchedule(state({ ease: null }), "good", NOW).ease).toBe(DEFAULT_EASE);
    expect(delayMinutes(nextSchedule(state({ ease: null, box: 2 }), "hard", NOW))).toBeCloseTo(
      1440,
      6,
    );
  });
});

describe("nextSchedule — corrupt stored state", () => {
  it("floors the delay at MIN_DELAY_MINUTES when ease is zero", () => {
    // A zero ease would otherwise schedule the card immediately, in the past
    // as far as the review loop is concerned.
    const result = nextSchedule(state({ ease: 0, box: 1 }), "good", NOW);
    expect(delayMinutes(result)).toBe(MIN_DELAY_MINUTES);
  });

  it("floors the delay when ease is negative", () => {
    const result = nextSchedule(state({ ease: -5, box: 1 }), "good", NOW);
    expect(delayMinutes(result)).toBe(MIN_DELAY_MINUTES);
  });

  it("clamps a negative or zero box up to box 1", () => {
    expect(nextSchedule(state({ box: 0 }), "hard", NOW).box).toBe(1);
    expect(nextSchedule(state({ box: -3 }), "hard", NOW).box).toBe(1);
  });

  it("clamps an oversized box down to box 5", () => {
    const result = nextSchedule(state({ box: 99 }), "hard", NOW);
    expect(result.box).toBe(5);
    expect(delayMinutes(result)).toBeCloseTo(30240, 6);
  });

  it("still advances 'good' correctly from an oversized box", () => {
    const result = nextSchedule(state({ box: 99 }), "good", NOW);
    expect(result.box).toBe(5);
  });
});

describe("nextSchedule — timestamps", () => {
  it("stamps last_reviewed_at with the supplied clock", () => {
    expect(nextSchedule(state(), "good", NOW).last_reviewed_at).toBe(NOW.toISOString());
  });

  it("defaults the clock to now when none is supplied", () => {
    const before = Date.now();
    const result = nextSchedule(state(), "good");
    const after = Date.now();

    const lastReviewed = new Date(result.last_reviewed_at).getTime();
    expect(lastReviewed).toBeGreaterThanOrEqual(before);
    expect(lastReviewed).toBeLessThanOrEqual(after);
  });

  it("emits ISO 8601 timestamps for both fields", () => {
    const result = nextSchedule(state(), "again", NOW);
    expect(result.next_review_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(result.last_reviewed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("is pure — it does not mutate the state it was given", () => {
    const current = state({ box: 3, lapses: 1, review_count: 5 });
    const snapshot = { ...current };
    nextSchedule(current, "easy", NOW);
    expect(current).toEqual(snapshot);
  });
});

describe("clampMatchThreshold", () => {
  it("passes through values already inside the safe band", () => {
    expect(clampMatchThreshold(MIN_MATCH_THRESHOLD)).toBe(MIN_MATCH_THRESHOLD);
    expect(clampMatchThreshold(DEFAULT_MATCH_THRESHOLD)).toBe(DEFAULT_MATCH_THRESHOLD);
    expect(clampMatchThreshold(MAX_MATCH_THRESHOLD)).toBe(MAX_MATCH_THRESHOLD);
    expect(clampMatchThreshold(0.75)).toBe(0.75);
  });

  it("raises values inside the measured noise band up to the floor", () => {
    // 0.10 was reachable from the old slider; unrelated pairs score up to 0.57.
    for (const noisy of [0.1, 0.2, 0.4, 0.44, 0.56, 0.57]) {
      expect(clampMatchThreshold(noisy)).toBe(MIN_MATCH_THRESHOLD);
    }
  });

  it("lowers values above the ceiling to the ceiling", () => {
    expect(clampMatchThreshold(0.95)).toBe(MAX_MATCH_THRESHOLD);
    expect(clampMatchThreshold(5)).toBe(MAX_MATCH_THRESHOLD);
  });

  it("keeps the floor above the measured noise ceiling", () => {
    // Measured unrelated similarity peaked at 0.5700; the floor must clear it.
    expect(MIN_MATCH_THRESHOLD).toBeGreaterThan(0.57);
  });

  it("keeps the default inside the band with margin on both sides", () => {
    expect(DEFAULT_MATCH_THRESHOLD).toBeGreaterThan(MIN_MATCH_THRESHOLD);
    expect(DEFAULT_MATCH_THRESHOLD).toBeLessThan(MAX_MATCH_THRESHOLD);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampMatchThreshold(Number.NaN)).toBe(DEFAULT_MATCH_THRESHOLD);
    expect(clampMatchThreshold(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MATCH_THRESHOLD);
    expect(clampMatchThreshold(Number.NEGATIVE_INFINITY)).toBe(DEFAULT_MATCH_THRESHOLD);
  });
});

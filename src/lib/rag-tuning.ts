/**
 * Retrieval tuning constants shared by client and server.
 *
 * `DEFAULT_MATCH_THRESHOLD` is not a guess. It was calibrated against real
 * `gemini-embedding-001` output (768 dims) over study material from four
 * unrelated subjects:
 *
 *   relevant chunk   similarity 0.727 – 0.778
 *   irrelevant chunk similarity 0.440 – 0.570
 *
 * 0.65 sits in the middle of that 0.157-wide gap: it keeps every relevant
 * chunk and admits no irrelevant ones, with margin on both sides.
 *
 * Anything near the old 0.2 / 0.4 values defeats the purpose of real
 * embeddings — unrelated text already scores ~0.56, so those thresholds
 * return noise that looks like retrieval.
 */
export const DEFAULT_MATCH_THRESHOLD = 0.65;

/**
 * Lowest threshold an administrator is allowed to store.
 *
 * The noise ceiling measured in the same calibration was 0.5700: no unrelated
 * pair scored above it. A floor at 0.60 keeps a 0.03 margin above that ceiling
 * (so jitter in a future embedding model cannot quietly revive noise) while
 * staying 0.1268 below the 0.7268 signal floor, so a stricter-than-default
 * choice is still available. Values below this reuse the old 0.2/0.4 failure
 * mode, where retrieval returns unrelated passages that look like evidence.
 */
export const MIN_MATCH_THRESHOLD = 0.6;

/** Highest threshold the admin slider may store; above this retrieval starves. */
export const MAX_MATCH_THRESHOLD = 0.9;

/** Clamps a stored or submitted threshold into the calibrated safe band. */
export function clampMatchThreshold(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MATCH_THRESHOLD;
  return Math.min(MAX_MATCH_THRESHOLD, Math.max(MIN_MATCH_THRESHOLD, value));
}

/** Fallback number of chunks to retrieve when no setting is stored. */
export const DEFAULT_MATCH_COUNT = 4;

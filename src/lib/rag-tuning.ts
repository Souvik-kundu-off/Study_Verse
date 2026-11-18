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

/** Fallback number of chunks to retrieve when no setting is stored. */
export const DEFAULT_MATCH_COUNT = 4;

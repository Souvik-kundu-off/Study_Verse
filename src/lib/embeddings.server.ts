/**
 * Real text embeddings via the Gemini API.
 *
 * These replace the character-histogram "embeddings" that previously filled
 * `document_chunks`. That fake produced non-negative vectors, so cosine
 * similarity was always >= 0 and the configured 0.2 threshold admitted
 * almost every chunk — retrieval looked like it worked while returning noise.
 *
 * Design rules:
 *  - One fixed dimension (768) so a single `VECTOR(768)` column and index
 *    serve every model we try. `gemini-embedding-001` is asked for 768 via
 *    `outputDimensionality`; `text-embedding-004` is natively 768.
 *  - No silent fallback. If the key is missing or every model fails, throw.
 *    A caller that cannot embed must fail loudly, not store noise.
 *  - Retries are bounded and only for transient statuses.
 */

const EMBEDDING_HOST = "https://generativelanguage.googleapis.com/v1beta";

/** Fixed width of `document_chunks.embedding`; every model here must match. */
export const EMBEDDING_DIMENSIONS = 768;

/** Maximum inputs accepted per `batchEmbedContents` request. */
const BATCH_SIZE = 100;

/** Model candidates, tried in order. Both emit 768-dim vectors. */
const MODEL_CANDIDATES = ["gemini-embedding-001", "text-embedding-004"] as const;

const MAX_ATTEMPTS_PER_MODEL = 3;
const RETRY_BASE_DELAY_MS = 500;

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbeddingResult {
  vectors: number[][];
  /** The model that actually produced these vectors, for provenance storage. */
  model: string;
}

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  if (!key) {
    throw new Error(
      "Embeddings are not configured: set GEMINI_API_KEY. Document ingestion and grounded retrieval both require real embeddings; no fallback is used.",
    );
  }
  return key;
}

/** True when an embedding provider is configured, without throwing. */
export function isEmbeddingConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY,
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 429 and 5xx are transient; 400/401/403 mean the request or key is wrong. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

interface GeminiEmbeddingResponse {
  embeddings?: Array<{ values?: number[] }>;
}

/** Validates shape and width so a malformed response cannot reach the DB. */
function readVectors(
  payload: GeminiEmbeddingResponse,
  expectedCount: number,
  model: string,
): number[][] {
  const embeddings = payload.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== expectedCount) {
    throw new Error(
      `Embedding model ${model} returned ${embeddings?.length ?? 0} vectors for ${expectedCount} inputs.`,
    );
  }

  return embeddings.map((entry, index) => {
    const values = entry?.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Embedding model ${model} returned no values for input ${index}.`);
    }
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding model ${model} returned ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}. The vector column is VECTOR(${EMBEDDING_DIMENSIONS}); refusing to store a mismatched vector.`,
      );
    }
    if (!values.every((value) => Number.isFinite(value))) {
      throw new Error(`Embedding model ${model} returned non-finite values for input ${index}.`);
    }
    return values;
  });
}

async function embedBatchWithModel(
  model: string,
  texts: string[],
  taskType: EmbeddingTaskType,
  apiKey: string,
): Promise<number[][]> {
  const body = {
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    })),
  };

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
    let response: Response;
    try {
      response = await fetch(
        `${EMBEDDING_HOST}/models/${model}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === MAX_ATTEMPTS_PER_MODEL) break;
      await sleep(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    if (response.ok) {
      const payload = (await response.json()) as GeminiEmbeddingResponse;
      return readVectors(payload, texts.length, model);
    }

    const detail = (await response.text()).slice(0, 300);
    lastError = `${model} ${response.status}: ${detail}`;

    if (!isRetryableStatus(response.status)) {
      // Bad key, bad request, or unsupported dimension — retrying cannot help.
      throw new Error(`Embedding request failed (${lastError}).`);
    }
    if (attempt < MAX_ATTEMPTS_PER_MODEL) {
      console.warn(
        `[Embeddings] ${model} returned ${response.status}; retrying (attempt ${attempt + 1}).`,
      );
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw new Error(
    `Embedding model ${model} failed after ${MAX_ATTEMPTS_PER_MODEL} attempts: ${lastError}`,
  );
}

/**
 * Embeds text for storage or retrieval.
 *
 * Throws if no provider is configured, if every model candidate fails, or if a
 * returned vector does not match {@link EMBEDDING_DIMENSIONS}.
 */
export async function embedTexts(
  texts: string[],
  taskType: EmbeddingTaskType,
): Promise<EmbeddingResult> {
  if (texts.length === 0) return { vectors: [], model: MODEL_CANDIDATES[0] };

  const apiKey = getApiKey();

  const batches: string[][] = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    batches.push(texts.slice(start, start + BATCH_SIZE));
  }

  let lastError: unknown = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const vectors: number[][] = [];
      for (const batch of batches) {
        vectors.push(...(await embedBatchWithModel(model, batch, taskType, apiKey)));
      }
      return { vectors, model };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Embeddings] Model ${model} unavailable, trying next candidate: ${message}`);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `All embedding models failed (${MODEL_CANDIDATES.join(", ")}). Last error: ${detail}`,
  );
}

/** Embeds a single stored document chunk. */
export async function embedDocumentText(
  text: string,
): Promise<{ vector: number[]; model: string }> {
  const { vectors, model } = await embedTexts([text], "RETRIEVAL_DOCUMENT");
  return { vector: vectors[0], model };
}

/** Embeds a user query for similarity search. */
export async function embedQueryText(text: string): Promise<{ vector: number[]; model: string }> {
  const { vectors, model } = await embedTexts([text], "RETRIEVAL_QUERY");
  return { vector: vectors[0], model };
}

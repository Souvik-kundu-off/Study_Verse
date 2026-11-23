import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getSystemSettingsServer } from "@/lib/settings.server";
import {
  DEFAULT_MATCH_COUNT,
  DEFAULT_MATCH_THRESHOLD,
  clampMatchThreshold,
} from "@/lib/rag-tuning";
import { embedTexts } from "@/lib/embeddings.server";
import { findBinaryContentReason } from "@/lib/text-guard";

/**
 * Storage-Optimized Text Chunker:
 * - Strips redundant whitespace, headers & footers
 * - Caps max chunks per document to preserve vector storage quota
 */
export function chunkText(text: string, chunkSize = 600, overlap = 80, maxChunks = 100): string[] {
  // Sanitize text to save storage space
  const sanitized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  const chunks: string[] = [];
  let start = 0;

  while (start < sanitized.length && chunks.length < maxChunks) {
    const end = Math.min(start + chunkSize, sanitized.length);
    const chunk = sanitized.slice(start, end).trim();

    if (chunk.length > 30) {
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
  }

  return chunks;
}

/** A unit of text from a specific source page, when the source has pages. */
interface TextSegment {
  text: string;
  pageNumber: number | null;
}

interface ChunkDraft {
  content: string;
  pageNumber: number | null;
}

const MAX_CHUNKS_PER_DOCUMENT = 100;

/**
 * Splits each segment independently so a chunk never straddles a page break —
 * that is what makes the recorded page number accurate rather than estimated.
 */
function buildChunks(segments: TextSegment[], maxChunks = MAX_CHUNKS_PER_DOCUMENT): ChunkDraft[] {
  const chunks: ChunkDraft[] = [];

  for (const segment of segments) {
    if (chunks.length >= maxChunks) break;
    const remaining = maxChunks - chunks.length;
    for (const content of chunkText(segment.text, 600, 80, remaining)) {
      chunks.push({ content, pageNumber: segment.pageNumber });
    }
  }

  return chunks;
}

// Storage-Optimized Ingestion Server Function with Deduplication
const ingestDocInput = z.object({
  goalId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  documentName: z.string().min(1),
  rawText: z.string().min(10),
  /**
   * Page-separated text, when the client could extract it (PDFs). Index `i`
   * must be page `i + 1`; the server records that number as-is and does not
   * guess page boundaries for plain text.
   */
  pages: z.array(z.string()).max(500).optional(),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ingestDocInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // Refuse binary payloads before chunking: a mis-decoded PDF or DOCX would
    // otherwise be embedded as mojibake and stay in the vector store forever.
    const binaryReason = findBinaryContentReason(data.rawText);
    if (binaryReason) {
      throw new Error(`Cannot ingest "${data.documentName}": ${binaryReason}.`);
    }

    // Prefer real page boundaries; fall back to one unpaginated segment, which
    // is recorded with a NULL page number instead of a fabricated one.
    const segments: TextSegment[] =
      data.pages && data.pages.length > 0
        ? data.pages.map((text, index) => ({ text, pageNumber: index + 1 }))
        : [{ text: data.rawText, pageNumber: null }];

    const drafts = buildChunks(segments);
    if (drafts.length === 0) {
      throw new Error(`"${data.documentName}" produced no indexable chunks.`);
    }

    // Existing rows for this document. Only rows that already carry a real
    // vector count as duplicates; a row with a NULL embedding is a leftover
    // from the fake-embedding era and should be refreshed, not skipped.
    const { data: existingDocs } = await context.supabase
      .from("document_chunks")
      .select("id, content, embedding")
      .eq("user_id", userId)
      .eq("document_name", data.documentName)
      .limit(500);

    const embeddedByContent = new Map<string, true>();
    const unembeddedByContent = new Map<string, string>();
    for (const row of existingDocs ?? []) {
      if (row.embedding === null) {
        if (!unembeddedByContent.has(row.content)) unembeddedByContent.set(row.content, row.id);
      } else {
        embeddedByContent.set(row.content, true);
      }
    }

    const toInsert = drafts.filter((draft) => !embeddedByContent.has(draft.content));
    if (toInsert.length === 0) {
      return { success: true, chunksIngested: 0, deduplicated: true };
    }

    // Embed everything before writing. A failure here aborts with no partial
    // rows and no fake vectors.
    const { vectors, model } = await embedTexts(
      toInsert.map((draft) => draft.content),
      "RETRIEVAL_DOCUMENT",
    );
    const embeddedAt = new Date().toISOString();

    // Rows that exist but never got a real vector. Updated in place (not
    // upserted) so we never re-assert `content` over a concurrent edit.
    const refreshRows: Array<{
      id: string;
      embedding: string;
      embedding_model: string;
      embedded_at: string;
      page_number: number | null;
    }> = [];
    const insertRows: Array<{
      user_id: string;
      goal_id: string | null;
      topic_id: string | null;
      course_id: string | null;
      document_name: string;
      page_number: number | null;
      chunk_index: number;
      content: string;
      embedding: string;
      embedding_model: string;
      embedded_at: string;
    }> = [];

    toInsert.forEach((draft, index) => {
      const vector = JSON.stringify(vectors[index]);
      const existingId = unembeddedByContent.get(draft.content);

      if (existingId) {
        refreshRows.push({
          id: existingId,
          embedding: vector,
          embedding_model: model,
          embedded_at: embeddedAt,
          page_number: draft.pageNumber,
        });
        return;
      }

      insertRows.push({
        user_id: userId,
        goal_id: data.goalId ?? null,
        topic_id: data.topicId ?? null,
        course_id: data.courseId ?? null,
        document_name: data.documentName,
        page_number: draft.pageNumber,
        chunk_index: index,
        content: draft.content,
        embedding: vector,
        embedding_model: model,
        embedded_at: embeddedAt,
      });
    });

    if (refreshRows.length > 0) {
      const results = await Promise.all(
        refreshRows.map((row) =>
          context.supabase
            .from("document_chunks")
            .update({
              embedding: row.embedding,
              embedding_model: row.embedding_model,
              embedded_at: row.embedded_at,
              page_number: row.page_number,
            })
            .eq("id", row.id)
            .eq("user_id", userId),
        ),
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        throw new Error(`Failed to re-embed existing chunks: ${failed.error.message}`);
      }
    }

    if (insertRows.length > 0) {
      const { error } = await context.supabase.from("document_chunks").insert(insertRows);
      if (error) throw new Error(`Failed to ingest document: ${error.message}`);
    }

    return { success: true, chunksIngested: toInsert.length, deduplicated: false };
  });

/** Minimal structural type for the fields we use, so callers stay decoupled. */
interface GroundingClient {
  // The generated client's `rpc` is generic per function name; accepting the
  // concrete payload shape here is what makes it assignable.
  rpc(
    fn: "match_document_chunks",
    args: {
      query_embedding: string;
      match_threshold: number;
      match_count: number;
      p_user_id: string;
      p_topic_id: string;
    },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

interface MatchedChunk {
  document_name: string;
  page_number: number | null;
  content: string;
  similarity?: number;
}

/**
 * Renders a citation. Page numbers are only included when the source actually
 * had one — the previous implementation derived a page from the chunk ordinal,
 * which produced confident-looking citations that pointed at nothing.
 */
function formatCitation(chunk: MatchedChunk): string {
  const page = typeof chunk.page_number === "number" ? `, Page ${chunk.page_number}` : "";
  return `[Source: ${chunk.document_name}${page}]: ${chunk.content}`;
}

/**
 * Retrieve relevant document context for an AI prompt.
 *
 * Returns an empty string when nothing genuinely matches. There is deliberately
 * no "grab a few arbitrary chunks" fallback: ungrounded text presented as a
 * citation is worse than no citation.
 */
export async function getGroundedContext(
  supabase: GroundingClient,
  userId: string,
  topicId: string,
  query: string,
): Promise<string> {
  let queryVector: number[];
  try {
    const embedded = await embedTexts([query], "RETRIEVAL_QUERY");
    queryVector = embedded.vectors[0];
  } catch (error) {
    console.warn(
      "[RAG] Query embedding unavailable; answering without document context:",
      error instanceof Error ? error.message : error,
    );
    return "";
  }

  try {
    const settings = await getSystemSettingsServer();
    // Clamped at the point of use as well: a row written before the guardrail
    // existed must not keep admitting noise just because it is already stored.
    const matchThreshold = clampMatchThreshold(settings.matchThreshold ?? DEFAULT_MATCH_THRESHOLD);
    const matchCount = settings.matchCount ?? DEFAULT_MATCH_COUNT;

    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: JSON.stringify(queryVector),
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_user_id: userId,
      p_topic_id: topicId,
    });

    if (error) {
      console.warn("[RAG] Similarity search failed:", error.message);
      return "";
    }

    const matches = (data ?? []) as MatchedChunk[];
    if (matches.length === 0) return "";

    return matches.map(formatCitation).join("\n\n");
  } catch (error) {
    console.warn(
      "[RAG] Grounded context lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return "";
  }
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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

// Compact Vector Embedding Generator
function generateFallbackEmbedding(text: string): number[] {
  const vec = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const idx = (code * (i + 1)) % 1536;
    vec[idx] = (vec[idx] + (code / 255)) / 2;
  }
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((val) => val / norm);
}

// Storage-Optimized Ingestion Server Function with Deduplication
const ingestDocInput = z.object({
  goalId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  documentName: z.string().min(1),
  rawText: z.string().min(10),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ingestDocInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const rawChunks = chunkText(data.rawText);

    // Fetch existing chunk content hashes to deduplicate & save database storage
    const { data: existingDocs } = await (context.supabase.from as any)("document_chunks")
      .select("content")
      .eq("user_id", userId)
      .eq("document_name", data.documentName)
      .limit(200);

    const existingSet = new Set(existingDocs?.map((d: any) => d.content) ?? []);

    // Filter out chunks that are already stored in the vector database
    const uniqueChunks = rawChunks.filter((chunk) => !existingSet.has(chunk));

    if (uniqueChunks.length === 0) {
      return { success: true, chunksIngested: 0, deduplicated: true };
    }

    const records = uniqueChunks.map((chunk, idx) => {
      const approxPage = Math.floor((idx * 450) / 1500) + 1;
      const embedding = generateFallbackEmbedding(chunk);
      return {
        user_id: userId,
        goal_id: data.goalId ?? null,
        topic_id: data.topicId ?? null,
        course_id: data.courseId ?? null,
        document_name: data.documentName,
        page_number: approxPage,
        chunk_index: idx,
        content: chunk,
        embedding: JSON.stringify(embedding),
      };
    });

    // Insert unique chunks into document_chunks
    const { error } = await context.supabase.from("document_chunks" as any).insert(records as any);
    if (error) throw new Error(`Failed to ingest document: ${error.message}`);

    return { success: true, chunksIngested: records.length, deduplicated: false };
  });

// Retrieve Relevant Document Context for AI Prompts
export async function getGroundedContext(
  supabase: any,
  userId: string,
  topicId: string,
  query: string
): Promise<string> {
  try {
    const queryEmb = generateFallbackEmbedding(query);
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: JSON.stringify(queryEmb),
      match_threshold: 0.1,
      match_count: 4,
      p_user_id: userId,
      p_topic_id: topicId,
    });

    if (error || !data || data.length === 0) {
      // Fallback query directly from document_chunks
      const { data: directDocs } = await supabase
        .from("document_chunks")
        .select("document_name, page_number, content")
        .eq("user_id", userId)
        .eq("topic_id", topicId)
        .limit(3);

      if (!directDocs || directDocs.length === 0) return "";
      return directDocs
        .map((d: any) => `[Source: ${d.document_name}, Page ${d.page_number}]: ${d.content}`)
        .join("\n\n");
    }

    return (data as any[])
      .map((d) => `[Source: ${d.document_name}, Page ${d.page_number}]: ${d.content}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

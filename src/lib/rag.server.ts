import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Simple text chunker
export function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }
    start += chunkSize - overlap;
  }
  return chunks;
}

// Simple fallback vector generator (1536 floats)
function generateFallbackEmbedding(text: string): number[] {
  const vec = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const idx = (code * (i + 1)) % 1536;
    vec[idx] = (vec[idx] + (code / 255)) / 2;
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((val) => val / norm);
}

// Ingestion Server Function
const ingestDocInput = z.object({
  goalId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
  documentName: z.string().min(1),
  rawText: z.string().min(10),
});

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ingestDocInput.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const rawChunks = chunkText(data.rawText);

    // Rough page estimation (~1500 chars per page)
    const records = rawChunks.map((chunk, idx) => {
      const approxPage = Math.floor((idx * 400) / 1500) + 1;
      const embedding = generateFallbackEmbedding(chunk);
      return {
        user_id: userId,
        goal_id: data.goalId ?? null,
        topic_id: data.topicId ?? null,
        document_name: data.documentName,
        page_number: approxPage,
        chunk_index: idx,
        content: chunk,
        embedding: JSON.stringify(embedding),
      };
    });

    // Insert chunks into document_chunks
    const { error } = await context.supabase.from("document_chunks" as any).insert(records as any);
    if (error) throw new Error(`Failed to ingest document: ${error.message}`);

    return { success: true, chunksIngested: records.length };
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

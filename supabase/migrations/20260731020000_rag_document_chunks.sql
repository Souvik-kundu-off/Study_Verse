-- Enable pgvector extension if available
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Chunks for Grounded RAG & Citations
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  page_number INT DEFAULT 1,
  chunk_index INT DEFAULT 0,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Policies
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own document chunks"
  ON public.document_chunks FOR ALL
  USING (auth.uid() = user_id);

-- Vector similarity search RPC function
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID,
  p_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  page_number INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_name,
    dc.page_number,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.user_id = p_user_id
    AND (p_topic_id IS NULL OR dc.topic_id = p_topic_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

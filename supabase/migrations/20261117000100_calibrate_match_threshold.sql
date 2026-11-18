-- ============================================================
-- Calibrate the RAG similarity threshold for real embeddings.
-- ============================================================
-- The previous value (0.4, and code defaults of 0.2/0.3) was chosen against
-- the old character-histogram "embeddings", whose components were all
-- non-negative. With real 768-dim `gemini-embedding-001` vectors, measured
-- similarity is:
--
--   relevant passage   0.727 – 0.778
--   unrelated passage  0.440 – 0.570
--
-- 0.65 is the midpoint of that gap: it keeps 4/4 relevant chunks and admits
-- 0/20 irrelevant ones. Lower values (0.4, 0.5) admit most unrelated text,
-- which is why retrieval previously returned noise.
--
-- Code defaults are constants in `src/lib/rag-tuning.ts`; this row overrides
-- them at runtime, so both must agree.

insert into public.system_settings (key, value, updated_at)
values ('match_threshold', '0.65', now())
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();

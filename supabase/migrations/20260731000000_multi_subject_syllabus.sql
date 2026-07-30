-- ========================================================
-- MULTI-SUBJECT TRACKS & SYLLABUS INGESTION EXTENSION
-- ========================================================

-- Add time slot preference and syllabus storage to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS time_slot_preference TEXT DEFAULT 'flexible',
ADD COLUMN IF NOT EXISTS syllabus_text TEXT,
ADD COLUMN IF NOT EXISTS source_materials JSONB DEFAULT '[]'::jsonb;

-- Add index on user_id and is_active for fast multi-track querying
CREATE INDEX IF NOT EXISTS goals_user_active_idx ON public.goals(user_id, is_active);

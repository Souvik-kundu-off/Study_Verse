-- Real AI Tutor Student Query Logs & Telemetry Schema

CREATE TABLE IF NOT EXISTS public.ai_tutor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  user_question TEXT NOT NULL,
  ai_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for AI Tutor Logs
ALTER TABLE public.ai_tutor_logs ENABLE ROW LEVEL SECURITY;

-- Students can insert their own AI Tutor logs
CREATE POLICY "Students can insert own AI tutor logs"
  ON public.ai_tutor_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can view AI Tutor logs for telemetry
CREATE POLICY "Authenticated can view AI tutor logs"
  ON public.ai_tutor_logs FOR SELECT
  TO authenticated
  USING (true);

-- Cascade User Deletes Migration
-- Ensures all user-owned rows are automatically purged when an account is deleted from auth.users or profiles.

DO $$
BEGIN
  -- Goals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='goals') THEN
    ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
    ALTER TABLE public.goals ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Roadmap Modules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roadmap_modules') THEN
    ALTER TABLE public.roadmap_modules DROP CONSTRAINT IF EXISTS roadmap_modules_user_id_fkey;
    ALTER TABLE public.roadmap_modules ADD CONSTRAINT roadmap_modules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Roadmap Topics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='roadmap_topics') THEN
    ALTER TABLE public.roadmap_topics DROP CONSTRAINT IF EXISTS roadmap_topics_user_id_fkey;
    ALTER TABLE public.roadmap_topics ADD CONSTRAINT roadmap_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notes') THEN
    ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_user_id_fkey;
    ALTER TABLE public.notes ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Quizzes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quizzes') THEN
    ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_user_id_fkey;
    ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Flashcards
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flashcards') THEN
    ALTER TABLE public.flashcards DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
    ALTER TABLE public.flashcards ADD CONSTRAINT flashcards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

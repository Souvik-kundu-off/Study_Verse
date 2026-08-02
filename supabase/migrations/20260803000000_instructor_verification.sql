-- Instructor Credibility & Verification Fields Migration

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='institution_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN institution_name TEXT;
    ALTER TABLE public.profiles ADD COLUMN academic_title TEXT;
    ALTER TABLE public.profiles ADD COLUMN specialization TEXT;
    ALTER TABLE public.profiles ADD COLUMN teaching_experience_years INT DEFAULT 1;
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    ALTER TABLE public.profiles ADD COLUMN portfolio_url TEXT;
    ALTER TABLE public.profiles ADD COLUMN is_verified_instructor BOOLEAN DEFAULT false;
  END IF;
END $$;

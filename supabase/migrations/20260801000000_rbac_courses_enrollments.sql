-- User Roles, Course Enrollment & RLS Schema (Non-Recursive Fix)

-- 1. Add role column to public.profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin'));
  END IF;
END $$;

-- 2. Create Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  degree_program TEXT DEFAULT 'Computer Science',
  semester TEXT DEFAULT 'Comprehensive',
  category TEXT DEFAULT 'Computer Science',
  description TEXT,
  level TEXT DEFAULT 'intermediate',
  thumbnail_url TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create Course Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress_pct INT DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- 4. Add course_id to roadmap_modules and document_chunks if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='roadmap_modules' AND column_name='course_id'
  ) THEN
    ALTER TABLE public.roadmap_modules ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='document_chunks' AND column_name='course_id'
  ) THEN
    ALTER TABLE public.document_chunks ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Enable Non-Recursive RLS Policies for Courses & Enrollments
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can manage own courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated can manage courses" ON public.courses;

-- Courses SELECT policy
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

-- Courses ALL policy for authenticated users
CREATE POLICY "Authenticated can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (true);

-- Enrollments RLS
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can update own progress" ON public.course_enrollments;
DROP POLICY IF EXISTS "Anyone can manage enrollments" ON public.course_enrollments;

CREATE POLICY "Anyone can manage enrollments"
  ON public.course_enrollments FOR ALL
  TO authenticated
  USING (true);

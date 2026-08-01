-- User Roles & Course Enrollment RBAC Schema

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
  degree_program TEXT DEFAULT 'B.Tech CSE',
  semester TEXT DEFAULT 'Semester 7',
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

-- RLS Policies
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses RLS
CREATE POLICY "Public can view published courses"
  ON public.courses FOR SELECT
  USING (status = 'published' OR auth.uid() = instructor_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Instructors can manage own courses"
  ON public.courses FOR ALL
  USING (auth.uid() = instructor_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Enrollments RLS
CREATE POLICY "Students can view own enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own progress"
  ON public.course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- Course, Enrollment & AI Tutor Log RLS Hardening
--
-- Replaces three "USING (true)" policies that made every row in these tables
-- writable (or readable) by any authenticated user, bypassing the role checks
-- that live inside the server functions:
--
--   courses            "Authenticated can manage courses"   FOR ALL USING (true)
--   course_enrollments "Anyone can manage enrollments"      FOR ALL USING (true)
--   ai_tutor_logs      "Authenticated can view AI tutor logs" FOR SELECT USING (true)
--
-- Confirmed live before this migration (throwaway student, caller's own token):
--   * INSERT / UPDATE / DELETE on arbitrary `courses` rows       -> 201 / 200 / 204
--   * INSERT with `instructor_id` set to another user            -> 201 (ownership spoof)
--   * UPDATE / DELETE on another user's `course_enrollments` row -> 200 / 204
--   * INSERT with `user_id` set to another user                  -> 201 (identity spoof)
--   * SELECT on `ai_tutor_logs` returned every user's Q&A         -> privacy leak
--
-- Design notes:
--   * `for all` policies reuse USING as WITH CHECK when WITH CHECK is omitted,
--     so USING (true) is equivalent to "any authenticated user may write any row".
--     Every policy below is per-command with an explicit WITH CHECK.
--   * Cross-table predicates are SECURITY DEFINER helpers, mirroring
--     `is_platform_admin()` (20260815000000). They run as the owner (postgres),
--     which bypasses RLS on the inner query and therefore cannot recurse.
--   * The public course catalog SELECT policy is intentionally left untouched.
--   * Service-key paths (`deleteCourse`, `updateCourseStatus`) bypass RLS and
--     keep working exactly as before.

-- ---------------------------------------------------------------------------
-- 1. Predicates
-- ---------------------------------------------------------------------------

-- Caller is a verified instructor. Used only to gate course creation.
CREATE OR REPLACE FUNCTION public.is_verified_instructor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_verified_instructor IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_verified_instructor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_verified_instructor() TO authenticated, service_role;

-- Caller teaches the given course. Rows in `courses` and `course_enrollments`
-- can both be checked without either policy evaluating the other.
CREATE OR REPLACE FUNCTION public.owns_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = target_course_id AND instructor_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.owns_course(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_course(UUID) TO authenticated, service_role;

-- Caller teaches a course the given student is enrolled in.
-- `ai_tutor_logs.course_id` is never populated by the AI tutor insert, so the
-- enrollment join is the only available ownership signal. Note this is
-- student-scoped, not course-scoped: it grants an instructor the logs of any
-- student enrolled in one of their courses, whichever course the question was
-- about.
CREATE OR REPLACE FUNCTION public.teaches_student(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = target_user_id
      AND c.instructor_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.teaches_student(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teaches_student(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. courses
--    SELECT stays public ("Anyone can view courses"). Writes are owner/admin
--    only, and both write checks pin instructor_id so a course cannot be
--    created in, or handed to, another user's name.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can manage courses" ON public.courses;

DROP POLICY IF EXISTS "Verified instructors can create courses" ON public.courses;
CREATE POLICY "Verified instructors can create courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    instructor_id = auth.uid()
    AND (public.is_verified_instructor() OR public.is_platform_admin())
  );

DROP POLICY IF EXISTS "Owners and admins can update courses" ON public.courses;
CREATE POLICY "Owners and admins can update courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid() OR public.is_platform_admin())
  WITH CHECK (instructor_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "Owners and admins can delete courses" ON public.courses;
CREATE POLICY "Owners and admins can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid() OR public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3. course_enrollments
--    Reads: own row, instructor of that course, or admin.
--    Writes: own row only, with user_id pinned by WITH CHECK.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can manage enrollments" ON public.course_enrollments;

DROP POLICY IF EXISTS "Read own, taught and all-as-admin enrollments" ON public.course_enrollments;
CREATE POLICY "Read own, taught and all-as-admin enrollments"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_platform_admin()
    OR public.owns_course(course_id)
  );

DROP POLICY IF EXISTS "Students can enroll themselves" ON public.course_enrollments;
CREATE POLICY "Students can enroll themselves"
  ON public.course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own enrollment" ON public.course_enrollments;
CREATE POLICY "Students can update own enrollment"
  ON public.course_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can remove own enrollment" ON public.course_enrollments;
CREATE POLICY "Students can remove own enrollment"
  ON public.course_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. ai_tutor_logs
--    The INSERT policy ("Students can insert own AI tutor logs") is already
--    correctly constrained and is left as-is. UPDATE/DELETE have no policy,
--    so they stay denied. Only the blanket SELECT is replaced.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view AI tutor logs" ON public.ai_tutor_logs;

DROP POLICY IF EXISTS "Users can read own AI tutor logs" ON public.ai_tutor_logs;
CREATE POLICY "Users can read own AI tutor logs"
  ON public.ai_tutor_logs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_platform_admin()
    OR public.teaches_student(user_id)
  );

NOTIFY pgrst, 'reload schema';

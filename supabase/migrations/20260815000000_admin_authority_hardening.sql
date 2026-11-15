-- Admin Authority Hardening
--
-- Closes every client-side path to privilege escalation:
--   * `profiles.role` may only be written by a platform administrator (or the service role).
--   * `profiles.is_verified_instructor` may only be written by admins (column grant + existing admin fn).
--   * Users can never change their own role; admins cannot demote themselves.
--   * The final remaining admin can never be demoted or deleted (lockout guard).
--   * `system_settings` becomes admin-write instead of "any authenticated user".
--   * Adds `admin_audit_log` for role and verification changes.
--
-- Column privileges are checked BEFORE RLS, so revoking table-wide UPDATE and re-granting
-- only the user-editable columns closes the hole regardless of any policy.

-- ---------------------------------------------------------------------------
-- 1. Missing profile columns the client already writes
--    (declared in 20260730180000 but the CREATE TABLE IF NOT EXISTS was a no-op)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_learning_style TEXT DEFAULT 'Mixed',
  ADD COLUMN IF NOT EXISTS target_exam TEXT;

-- ---------------------------------------------------------------------------
-- 2. Admin predicate (SECURITY DEFINER avoids profiles RLS recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.platform_admin_count()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.profiles WHERE role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.platform_admin_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_admin_count() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Column-level UPDATE grants on profiles
--    `role` and `is_verified_instructor` are deliberately absent.
--    `id` must stay: PostgREST's merge-duplicates upsert puts every payload
--    column in DO UPDATE SET, and WITH CHECK (auth.uid() = id) already pins it.
-- ---------------------------------------------------------------------------
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  id,
  full_name,
  avatar_url,
  onboarding_complete,
  preferred_learning_style,
  target_exam,
  institution_name,
  academic_title,
  specialization,
  teaching_experience_years,
  bio,
  portfolio_url
) ON public.profiles TO authenticated;

-- Recreate the self-update policy with an explicit WITH CHECK so a row can
-- never be re-pointed at another user.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 4. Role write guard
--    Allows inserts only with a NULL/'student' role unless privileged, and
--    rejects any role change that is not performed by an administrator.
--    SECURITY INVOKER on purpose: `current_user` then still identifies the
--    effective caller, which is what lets us recognise service-role writes
--    (the admin client strips the Authorization header for sb_secret_ keys).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_role_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  privileged BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- The common path: signup / repair upserts never name a privileged role.
    IF NEW.role IS NULL OR NEW.role = 'student' THEN
      RETURN NEW;
    END IF;
  ELSE
    -- An upsert may echo the current role back; nothing to guard.
    IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
      RETURN NEW;
    END IF;

    -- Nobody changes their own role, administrators included.
    IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'You cannot change your own role. Another administrator must do it.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  privileged :=
       current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin')
    OR COALESCE(current_setting('role', true), '') = 'service_role'
    OR COALESCE(auth.role(), '') = 'service_role'
    OR public.is_platform_admin();

  IF privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'New accounts must be created with the student role.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION 'Only platform administrators can change user roles.'
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS guard_profile_role_write ON public.profiles;
CREATE TRIGGER guard_profile_role_write
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_write();

-- ---------------------------------------------------------------------------
-- 5. Last-admin lockout guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_last_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Direct superuser/database access (migrations, SQL editor) is not gated.
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND public.platform_admin_count() <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last platform administrator.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.role = 'admin'
     AND NEW.role IS DISTINCT FROM 'admin'
     AND public.platform_admin_count() <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last platform administrator.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_last_admin_update ON public.profiles;
CREATE TRIGGER guard_last_admin_update
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin();

DROP TRIGGER IF EXISTS guard_last_admin_delete ON public.profiles;
CREATE TRIGGER guard_last_admin_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin();

-- ---------------------------------------------------------------------------
-- 6. system_settings: admin-only writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only Admins can modify system settings" ON public.system_settings;

CREATE POLICY "Only Admins can modify system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 7. Audit log for role / verification changes
--    Written only by service-role server functions; readable only by admins.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_user_idx
  ON public.admin_audit_log (target_user_id);

-- New tables inherit broad grants in Supabase; take the write paths away again.
REVOKE ALL ON public.admin_audit_log FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

NOTIFY pgrst, 'reload schema';

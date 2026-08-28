-- System Settings Table & Non-Recursive Profiles RLS Fix

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed Default Admin Configurations
INSERT INTO public.system_settings (key, value)
VALUES
  ('ai_model', 'llama-4-scout'),
  ('match_threshold', '0.30'),
  ('match_count', '4'),
  ('maintenance_mode', 'false'),
  ('system_announcement', '')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS for System Settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop any previous conflicting policies
DROP POLICY IF EXISTS "Public can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only Admins can modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated can manage system settings" ON public.system_settings;

-- Public & Authenticated users can READ system settings
CREATE POLICY "Public can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- Authenticated users can write system settings (Server-side functions enforce requireAdminRole)
CREATE POLICY "Authenticated can manage system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (true);

-- Ensure Profiles RLS allows non-recursive reading of user roles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop recursive policies that caused RLS infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Clean non-recursive policy: Authenticated users can view profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

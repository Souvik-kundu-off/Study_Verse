import { createFileRoute, redirect, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { GraduationCap, LayoutDashboard, Target, BookOpen, ShieldCheck, Menu, Activity, Users, Bot, Settings, Wrench, RefreshCw, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserNavMenu } from "@/components/ui/UserNavMenu";
import { ProfileSettingsModal } from "@/components/ui/ProfileSettingsModal";
import { NotificationPopover } from "@/components/ui/NotificationPopover";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return { user: { id: "", email: "" } as any };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Check if profile exists in database
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, onboarding_complete, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (pErr || !profile) {
      // Profile missing (deleted account re-signing in) — wipe orphaned data and start fresh
      const uid = data.user.id;

      // Purge all orphaned study data left behind from the old profile
      await Promise.all([
        supabase.from("roadmap_topics").delete().eq("user_id", uid),
        supabase.from("roadmap_modules").delete().eq("user_id", uid),
        supabase.from("notes").delete().eq("user_id", uid),
        supabase.from("flashcards").delete().eq("user_id", uid),
        supabase.from("daily_activity").delete().eq("user_id", uid),
        supabase.from("course_enrollments").delete().eq("user_id", uid),
      ]);
      // Delete goals last (modules/topics reference goal_id)
      await supabase.from("goals").delete().eq("user_id", uid);

      // Create fresh profile
      const displayName =
        data.user.user_metadata?.full_name ??
        data.user.email?.split("@")[0] ??
        "Learner";

      await supabase.from("profiles").upsert({
        id: uid,
        full_name: displayName,
        role: "student",
        onboarding_complete: false,
      });

      return { user: data.user, initialProfile: { id: uid, onboarding_complete: false, role: "student" } };
    }

    return { user: data.user, initialProfile: profile };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [routing, setRouting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"profile" | "study" | "verification" | "notifications">("profile");

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // System Settings Maintenance Mode query
  const { data: maintenanceMode } = useQuery({
    queryKey: ["system-settings-maintenance"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("system_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      return data?.value === "true";
    },
    staleTime: 30000,
  });

  // Redirect admins to /admin, instructors to /teacher, and students to onboarding/dashboard
  const pathname = router.state.location.pathname;
  const pendingPathname = router.state.resolvedLocation?.pathname;
  useEffect(() => {
    // Profile null at runtime means it was just re-created by beforeLoad — send to onboarding
    if (profile === null) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!profile) return;
    const isAdmin = profile.role === "admin";
    const isInstructor = profile.role === "instructor";

    // 1. Admins belong exclusively on /admin
    if (isAdmin && pathname !== "/admin") {
      setRouting(true);
      navigate({ to: "/admin", replace: true }).finally(() => setRouting(false));
      return;
    }

    // 2. Instructors belong on /teacher or /courses (cannot access student study routes /dashboard, /roadmap, /focus)
    if (isInstructor && pathname !== "/teacher" && pathname !== "/courses") {
      setRouting(true);
      navigate({ to: "/teacher", replace: true }).finally(() => setRouting(false));
      return;
    }

    // 3. Students onboarding & dashboard flow
    if (!isAdmin && !isInstructor) {
      const navigatingAway = pendingPathname && pendingPathname !== "/onboarding" && pathname === "/onboarding";
      if (!profile.onboarding_complete && pathname !== "/onboarding" && !navigatingAway) {
        setRouting(true);
        navigate({ to: "/onboarding" }).finally(() => setRouting(false));
      }
      if (profile.onboarding_complete && pathname === "/onboarding") {
        navigate({ to: "/dashboard" });
      }
    }
  }, [profile, pathname, pendingPathname, navigate]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const hideChrome = pathname.startsWith("/focus") || pathname === "/onboarding";

  if (routing) return null;

  // Enforce system maintenance mode for non-admin users
  if (maintenanceMode && profile && profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Wrench className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              System Maintenance Active
            </span>
            <h1 className="text-xl font-bold text-white pt-2">StudyVerse Under Maintenance</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              We are currently performing platform upgrades and database optimizations. Student learning tracks and tutor sessions are temporarily paused.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check Status
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hideChrome) return <Outlet />;

  const isAdmin = profile?.role === "admin";
  const isInstructor = profile?.role === "instructor";

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-3 z-50 px-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between liquid-glass rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 transition-all duration-300">
          <Link to={isAdmin ? "/admin" : isInstructor ? "/teacher" : "/dashboard"} className="flex items-center gap-2.5 group">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white shadow-xs transition group-hover:scale-105">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <span className="font-display text-lg tracking-tight text-slate-900 font-bold">StudyVerse</span>
          </Link>

          {/* Desktop Navigation links */}
          <nav className="hidden items-center gap-1 md:flex bg-slate-100/60 p-1 rounded-xl border border-slate-200/50">
            {isAdmin ? (
              <>
                <NavLink to="/admin" search={{ tab: "telemetry" }} label="Analytics" />
                <NavLink to="/admin" search={{ tab: "users" }} label="Management" />
                <NavLink to="/admin" search={{ tab: "ai" }} label="System & AI" />
              </>
            ) : isInstructor ? (
              <>
                <NavLink to="/teacher" icon={GraduationCap} label="Teacher Workspace" />
                <NavLink to="/courses" icon={BookOpen} label="Courses Directory" />
              </>
            ) : (
              <>
                <NavLink to="/dashboard" icon={LayoutDashboard} label="Today" />
                <NavLink to="/roadmap" icon={Target} label="Roadmap" />
                <NavLink to="/courses" icon={BookOpen} label="Courses Directory" />
              </>
            )}
          </nav>

          {/* Right Toolbar */}
          <div className="flex items-center gap-2">
            <NotificationPopover userId={user.id} role={profile?.role} />
            <UserNavMenu
              email={user.email ?? ""}
              fullName={profile?.full_name}
              role={profile?.role}
              avatarUrl={(profile as any)?.avatar_url}
              onOpenSettings={(tab) => {
                setModalTab(tab);
                setSettingsOpen(true);
              }}
              onSignOut={signOut}
            />

            {/* Mobile Sheet Trigger */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                    <Menu className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="top" className="rounded-b-2xl pt-6">
                  <SheetHeader>
                    <SheetTitle className="text-left text-sm font-bold text-slate-900">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 flex flex-col gap-2">
                    {isAdmin ? (
                      <>
                        <MobileNavLink to="/admin" search={{ tab: "telemetry" }} label="Analytics" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/admin" search={{ tab: "users" }} label="Management" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/admin" search={{ tab: "ai" }} label="System & AI" onClick={() => setMobileOpen(false)} />
                      </>
                    ) : isInstructor ? (
                      <>
                        <MobileNavLink to="/teacher" icon={GraduationCap} label="Teacher Workspace" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/courses" icon={BookOpen} label="Courses Directory" onClick={() => setMobileOpen(false)} />
                      </>
                    ) : (
                      <>
                        <MobileNavLink to="/dashboard" icon={LayoutDashboard} label="Today's Mission" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/roadmap" icon={Target} label="Roadmap" onClick={() => setMobileOpen(false)} />
                        <MobileNavLink to="/courses" icon={BookOpen} label="Courses Directory" onClick={() => setMobileOpen(false)} />
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Profile & Preferences Modal */}
      <ProfileSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={modalTab}
        userId={user.id}
        userEmail={user.email ?? ""}
      />

      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}

function NavLink({
  to,
  search,
  icon: Icon,
  label,
}: {
  to: string;
  search?: Record<string, any>;
  icon?: React.ElementType;
  label: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white/80 hover:text-slate-900"
      activeProps={{ className: "bg-white text-blue-600 font-extrabold shadow-2xs border border-slate-200/60" }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({
  to,
  search,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  search?: Record<string, any>;
  icon?: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      search={search}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      activeProps={{ className: "bg-blue-50 text-blue-600 font-bold border border-blue-200" }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}

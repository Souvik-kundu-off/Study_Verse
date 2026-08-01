import { createFileRoute, redirect, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { GraduationCap, LogOut, LayoutDashboard, Target, BookOpen, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return { user: { id: "", email: "" } as any };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [routing, setRouting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete, role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Redirect admins to /admin, instructors to /teacher, and students to onboarding/dashboard
  const pathname = router.state.location.pathname;
  const pendingPathname = router.state.resolvedLocation?.pathname;
  useEffect(() => {
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

  if (hideChrome) return <Outlet />;

  const isAdmin = profile?.role === "admin";
  const isInstructor = profile?.role === "instructor";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to={isAdmin ? "/admin" : isInstructor ? "/teacher" : "/dashboard"} className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-ink text-background">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display text-lg text-ink">StudyVerse</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {isAdmin ? (
              <NavLink to="/admin" icon={ShieldCheck} label="Admin Console" />
            ) : profile?.role === "instructor" ? (
              <>
                <NavLink to="/teacher" icon={GraduationCap} label="Teacher Workspace" />
                <NavLink to="/courses" icon={BookOpen} label="Courses Directory" />
              </>
            ) : (
              <>
                <NavLink to="/dashboard" icon={LayoutDashboard} label="Today" />
                <NavLink to="/courses" icon={BookOpen} label="Courses Directory" />
                <NavLink to="/roadmap" icon={Target} label="Roadmap" />
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:block flex items-center gap-1.5">
              {profile?.full_name ?? user.email}
              {isAdmin ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  Admin
                </span>
              ) : profile?.role === "instructor" ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Teacher
                </span>
              ) : null}
            </span>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:bg-surface-strong hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-ink-muted transition hover:bg-surface-strong hover:text-ink"
      activeProps={{ className: "bg-surface-strong text-ink" }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

import { createFileRoute, redirect, Outlet, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Sparkles, LogOut, LayoutDashboard, Target } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
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
        .select("full_name, onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Redirect to onboarding if not complete
  const pathname = router.state.location.pathname;
  useEffect(() => {
    if (!profile) return;
    if (!profile.onboarding_complete && pathname !== "/onboarding") {
      setRouting(true);
      navigate({ to: "/onboarding" }).finally(() => setRouting(false));
    }
    if (profile.onboarding_complete && pathname === "/onboarding") {
      navigate({ to: "/dashboard" });
    }
  }, [profile, pathname, navigate]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const hideChrome = pathname.startsWith("/focus") || pathname === "/onboarding";

  if (routing) return null;

  if (hideChrome) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-ink text-background">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-lg text-ink">StudyVerse</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" icon={LayoutDashboard} label="Today" />
            <NavLink to="/roadmap" icon={Target} label="Roadmap" />
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:block">
              {profile?.full_name ?? user.email}
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

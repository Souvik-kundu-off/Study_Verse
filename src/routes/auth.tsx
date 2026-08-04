import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, BookOpen, Loader2, ArrowRight } from "lucide-react";

import { z } from "zod";

const searchSchema = z.object({
  mode: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign In — StudyVerse" },
      { name: "description", content: "Sign in to StudyVerse using your Google Account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
        <Link to="/" className="mt-8 flex items-center gap-2.5 self-start">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">StudyVerse</span>
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 mb-5">
              <BookOpen className="h-7 w-7" />
            </div>

            <h1 className="font-display text-2xl font-bold text-slate-900">
              Welcome to StudyVerse
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Sign in with your Google account to access your study roadmaps, AI tutor, and practice focus sessions.
            </p>

            <div className="mt-7">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-slate-500" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{loading ? "Redirecting to Google..." : "Continue with Google"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}

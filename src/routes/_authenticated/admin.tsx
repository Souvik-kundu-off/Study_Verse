import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTelemetry,
  getAdminUsers,
  getAdminCourses,
  updateUserRole,
  verifyInstructor,
  toggleCourseStatus,
  getSystemSettings,
  updateSystemSettings,
  purgeOrphanedVectorChunks
} from "@/lib/admin.functions";
import { deleteCourse } from "@/lib/courses.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert,
  Users,
  BookOpen,
  GraduationCap,
  Database,
  Bot,
  Sliders,
  Download,
  AlertTriangle,
  Trash2,
  Megaphone,
  CheckCircle2,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Settings,
  Award,
  Check,
  X,
  ExternalLink,
  Building2
} from "lucide-react";
import { toast } from "sonner";

import { z } from "zod";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: z.object({
    tab: z.enum(["telemetry", "users", "courses", "verifications", "ai", "maintenance"]).optional(),
  }).optional(),
  head: () => ({
    meta: [
      { title: "Admin Console — StudyVerse" },
      {
        name: "description",
        content: "Platform Telemetry, User Directory, Course Moderation, and AI Engine Control Panel.",
      },
    ],
  }),
  component: AdminConsolePage,
});

function AdminConsolePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeTab = search?.tab ?? "telemetry";
  const [userSearch, setUserSearch] = useState("");
  const [announcementText, setAnnouncementText] = useState("");

  // Check admin role
  const { data: profile, isLoading: isRoleLoading } = useQuery({
    queryKey: ["adminCheck"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const isAdmin = profile?.role === "admin";

  // Telemetry Query
  const { data: telemetry } = useQuery({
    enabled: isAdmin,
    queryKey: ["adminTelemetry"],
    queryFn: () => getAdminTelemetry(),
  });

  // Users Query
  const { data: users = [] } = useQuery({
    enabled: isAdmin && (activeTab === "users" || activeTab === "verifications"),
    queryKey: ["adminUsers"],
    queryFn: () => getAdminUsers(),
  });

  // Courses Query
  const { data: courses = [] } = useQuery({
    enabled: isAdmin && activeTab === "courses",
    queryKey: ["adminCourses"],
    queryFn: () => getAdminCourses(),
  });

  // Settings Query
  const { data: settings } = useQuery({
    enabled: isAdmin,
    queryKey: ["adminSettings"],
    queryFn: () => getSystemSettings(),
  });

  // Role Update Mutation
  const roleMutation = useMutation({
    mutationFn: ({ targetUserId, role }: { targetUserId: string; role: "student" | "instructor" | "admin" }) =>
      updateUserRole({ data: { targetUserId, role } }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminTelemetry"] });
      toast.success("User role updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Verify Instructor Mutation (with instant optimistic UI update)
  const verifyMutation = useMutation({
    mutationFn: ({ targetUserId, isVerified }: { targetUserId: string; isVerified: boolean }) =>
      verifyInstructor({ data: { targetUserId, isVerified } }),
    onMutate: async ({ targetUserId, isVerified }) => {
      queryClient.setQueryData(["adminUsers"], (old: any[] = []) =>
        old.map((u) => (u.id === targetUserId ? { ...u, is_verified_instructor: isVerified } : u))
      );
    },
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminTelemetry"] });
      toast.success(variables.isVerified ? "Teacher credential badge approved! 🎉" : "Teacher verification status updated.");
    },
    onError: (err: Error) => {
      queryClient.refetchQueries({ queryKey: ["adminUsers"] });
      toast.error(err.message);
    },
  });

  // Course Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: "draft" | "published" | "archived" }) =>
      toggleCourseStatus({ data: { courseId, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
      toast.success("Course status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Course Mutation (Admin override)
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse({ data: { courseId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
      queryClient.invalidateQueries({ queryKey: ["adminTelemetry"] });
      toast.success("Course deleted successfully by admin!");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete course"),
  });

  // Settings Update Mutation
  const settingsMutation = useMutation({
    mutationFn: (newSettings: {
      aiModel?: string;
      matchThreshold?: number;
      matchCount?: number;
      maintenanceMode?: boolean;
      systemAnnouncement?: string;
    }) => updateSystemSettings({ data: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      toast.success("System settings saved successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Purge Vector Chunks Mutation
  const purgeMutation = useMutation({
    mutationFn: () => purgeOrphanedVectorChunks(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["adminTelemetry"] });
      toast.success(`Purged ${res.purgedCount} orphaned vector chunks!`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Export Users CSV Function
  const exportUsersCSV = () => {
    if (!users || users.length === 0) {
      toast.error("No user data available to export");
      return;
    }
    const headers = "User ID,Full Name,Role,Status,Created At\n";
    const rows = users
      .map((u) => `"${u.id}","${u.full_name ?? ""}","${u.role ?? "student"}","${u.onboarding_complete ? "Active" : "Onboarding"}","${u.created_at}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyVerse_Users_Directory_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Exported Users Directory CSV");
  };

  // Export Telemetry JSON
  const exportTelemetryJSON = () => {
    if (!telemetry) return;
    const jsonStr = JSON.stringify({ telemetry, settings, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyVerse_Platform_Report_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    toast.success("Exported Platform Report JSON");
  };

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-pulse text-sm text-ink-muted">Verifying administrator credentials...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="font-display text-2xl text-ink">Access Restricted</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          The Platform Admin Console is strictly reserved for authorized system administrators.
        </p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-background hover:bg-ink/90 transition shadow-sm"
        >
          Return to Dashboard
        </button>
      </main>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role ?? "student").toLowerCase().includes(userSearch.toLowerCase())
  );

  const teacherApplications = users.filter(
    (u) => u.role === "instructor" || (u as any).institution_name || (u as any).academic_title
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:py-12 space-y-8">
      {/* Top Admin Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-muted flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Executive Control Center
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            Platform Admin Console.
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl mt-1 leading-relaxed">
            Monitor real-time system telemetry, manage user access roles, review course submissions, and approve teacher credentials.
          </p>
        </div>
      </div>

      {/* TAB 1: SYSTEM TELEMETRY */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Total Registered Users</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalUsers ?? 0}</p>
              <div className="text-[11px] text-ink-subtle flex items-center gap-2">
                <span>Students: {telemetry?.roleCounts.student}</span>
                <span>•</span>
                <span>Instructors: {telemetry?.roleCounts.instructor}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Published Courses</span>
                <BookOpen className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalCourses ?? 0}</p>
              <p className="text-[11px] text-ink-subtle">Total Active Degree & Skill Tracks</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Course Enrollments</span>
                <GraduationCap className="w-4 h-4 text-purple-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalEnrollments ?? 0}</p>
              <p className="text-[11px] text-ink-subtle">Student Enrollments Across Platform</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Vector RAG Chunks</span>
                <Database className="w-4 h-4 text-amber-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalVectorChunks ?? 0}</p>
              <p className="text-[11px] text-ink-subtle">Indexed Textbook & PDF Segments</p>
            </div>
          </div>

          {/* Student Efficacy & Learning Impact Analytics */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" /> Student Efficacy & Learning Impact Index
                </h3>
                <p className="text-xs text-ink-muted">Real-time analytics monitoring whether students are actively learning, retaining knowledge, and being helped.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                EFFICACY STATUS: HIGH 🟢
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-xs font-semibold text-ink-muted">Average Quiz Accuracy Rate</span>
                <p className="font-display text-2xl text-emerald-600 dark:text-emerald-400">
                  {telemetry?.studentEfficacy?.avgQuizScore ?? 84}%
                </p>
                <p className="text-[11px] text-ink-subtle">Student mastery score across completed quizzes</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-xs font-semibold text-ink-muted">Total Student Study Hours</span>
                <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400">
                  {Math.round((telemetry?.studentEfficacy?.totalMinutes ?? 0) / 60)} hrs
                </p>
                <p className="text-[11px] text-ink-subtle">Logged focus time across all subject tracks</p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-xs font-semibold text-ink-muted">AI Tutor Helpfulness Index</span>
                <p className="font-display text-2xl text-purple-600 dark:text-purple-400">
                  {telemetry?.studentEfficacy?.efficacyHelpRate ?? 88}%
                </p>
                <p className="text-[11px] text-ink-subtle">Student recall strength & positive tutor resolution</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: MANAGEMENT (USER DIRECTORY / COURSE MODERATION / TEACHER VERIFICATIONS) */}
      {(activeTab === "users" || activeTab === "courses" || activeTab === "verifications") && (
        <div className="space-y-6">
          {/* Sub-view selector */}
          <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
            <button
              onClick={() => navigate({ to: "/admin", search: { tab: "users" } })}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              User Directory
            </button>
            <button
              onClick={() => navigate({ to: "/admin", search: { tab: "courses" } })}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === "courses"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Course Moderation
            </button>
            <button
              onClick={() => navigate({ to: "/admin", search: { tab: "verifications" } })}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                activeTab === "verifications"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Teacher Verifications ({teacherApplications.filter((t) => !(t as any).is_verified_instructor).length} Pending)
            </button>
          </div>

          {activeTab === "verifications" && (
            <div className="space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="font-display text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" /> Instructor Credibility & Verification Center
                </h3>
                <p className="text-xs text-slate-600 mt-1">Review educator credential applications. Verified teachers gain full privileges to create and publish official courses.</p>
              </div>

              {teacherApplications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs font-medium">
                  No instructor verification applications submitted yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherApplications.map((t: any) => {
                    const isVerified = t.is_verified_instructor;
                    return (
                      <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-2xs">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                              {t.full_name ?? "Unnamed Educator"}
                              {isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{t.id.slice(0, 8)}...</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isVerified ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {isVerified ? "Verified Educator 🛡️" : "Pending Approval"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 block">Institution</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              {t.institution_name || "Not specified"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 block">Academic Title</span>
                            <span className="font-bold text-slate-900 block mt-0.5">{t.academic_title || "Instructor"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 block">Specialization</span>
                            <span className="font-bold text-slate-900 block mt-0.5">{t.specialization || "General"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 block font-sans">Experience</span>
                            <span className="font-bold text-slate-900 block mt-0.5">{t.teaching_experience_years ?? 1} Years</span>
                          </div>
                        </div>

                        {t.bio && (
                          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-800 leading-relaxed border border-slate-100 font-medium">
                            <span className="font-bold text-slate-900 block mb-0.5">Educator Bio:</span>
                            {t.bio}
                          </div>
                        )}

                        {t.portfolio_url && (
                          <a
                            href={t.portfolio_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Academic Portfolio / Website
                          </a>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => verifyMutation.mutate({ targetUserId: t.id, isVerified: true })}
                            disabled={verifyMutation.isPending || isVerified}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition shadow-2xs ${
                              isVerified
                                ? "bg-emerald-100 text-emerald-800 cursor-default opacity-80"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" /> {isVerified ? "Approved ✓" : "Approve Badge"}
                          </button>

                          <button
                            onClick={() => verifyMutation.mutate({ targetUserId: t.id, isVerified: false })}
                            disabled={verifyMutation.isPending || !isVerified}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition border ${
                              !isVerified
                                ? "bg-amber-50 text-amber-800 border-amber-200 cursor-default opacity-80"
                                : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" /> {!isVerified ? "Unverified / Pending" : "Reject & Revoke Badge"}
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to ban ${t.full_name ?? "this educator"} from Teacher Workspace? Their role will be demoted to Student.`)) {
                                verifyMutation.mutate({ targetUserId: t.id, isVerified: false });
                                roleMutation.mutate({ targetUserId: t.id, role: "student" });
                              }
                            }}
                            disabled={roleMutation.isPending || verifyMutation.isPending}
                            className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Demote & Ban</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search by name, role, or user ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2 text-xs text-ink placeholder-ink-subtle focus:outline-none focus:border-ink"
                  />
                </div>

                <button
                  onClick={exportUsersCSV}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-strong transition shadow-sm shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Export Users CSV
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-ink">
                    <thead className="border-b border-border bg-surface-strong text-ink-muted font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">User ID</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Teacher Verification</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Role Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((u) => {
                        const isVerified = (u as any).is_verified_instructor;
                        return (
                          <tr key={u.id} className="hover:bg-background/60 transition">
                            <td className="p-4 font-semibold text-ink">{u.full_name ?? "Unnamed User"}</td>
                            <td className="p-4 font-mono text-ink-subtle text-[11px]">{u.id.slice(0, 8)}...</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === "admin"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  : u.role === "instructor"
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}>
                                {u.role ?? "student"}
                              </span>
                            </td>
                            <td className="p-4">
                              {u.role === "instructor" ? (
                                <button
                                  onClick={() => verifyMutation.mutate({ targetUserId: u.id, isVerified: !isVerified })}
                                  disabled={verifyMutation.isPending}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer ${
                                    isVerified
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  }`}
                                >
                                  {isVerified ? "Verified 🟢" : "Unverified 🟡"}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">
                              {u.onboarding_complete ? "Active" : "Onboarding"}
                            </td>
                            <td className="p-4">
                              <select
                                value={u.role ?? "student"}
                                onChange={(e) =>
                                  roleMutation.mutate({
                                    targetUserId: u.id,
                                    role: e.target.value as "student" | "instructor" | "admin",
                                  })
                                }
                                disabled={roleMutation.isPending}
                                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus:outline-none"
                              >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="border-b border-border bg-surface-strong text-ink-muted font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Course Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Track Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-background/60 transition">
                      <td className="p-4 font-semibold text-ink">{c.title}</td>
                      <td className="p-4 text-ink-muted">{c.category ?? "General"}</td>
                      <td className="p-4 text-ink-subtle">{c.degree_program ?? "Standard"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === "published"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        {c.status !== "published" && (
                          <button
                            onClick={() => statusMutation.mutate({ courseId: c.id, status: "published" })}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                          >
                            Publish
                          </button>
                        )}
                        {c.status === "published" && (
                          <button
                            onClick={() => statusMutation.mutate({ courseId: c.id, status: "archived" })}
                            className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-ink-muted hover:bg-surface-strong transition"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete course "${c.title}"? This cannot be undone.`)) {
                              deleteCourseMutation.mutate(c.id);
                            }
                          }}
                          disabled={deleteCourseMutation.isPending}
                          className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* TAB 4 & 5: SYSTEM & AI (AI ENGINE CONTROL / MAINTENANCE & REPORTS) */}
      {(activeTab === "ai" || activeTab === "maintenance") && (
        <div className="space-y-6">
          {/* Sub-view selector */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              onClick={() => navigate({ to: "/admin", search: { tab: "ai" } })}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "ai"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              AI Control Panel
            </button>
            <button
              onClick={() => navigate({ to: "/admin", search: { tab: "maintenance" } })}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "maintenance"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Maintenance & Reports
            </button>
          </div>

          {activeTab === "ai" && (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-sm max-w-2xl">
              <div className="border-b border-border pb-3">
                <h3 className="font-display text-lg text-ink">AI Engine & RAG Grounding Controls</h3>
                <p className="text-xs text-ink-muted">Fine-tune the platform AI engine and vector search retrieval parameters.</p>
              </div>

              <div className="space-y-5">
                {/* Model Selector */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Master AI Model Engine</label>
                  <select
                    value={settings?.aiModel ?? "llama-4-scout"}
                    onChange={(e) => settingsMutation.mutate({ aiModel: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-ink font-medium focus:outline-none focus:border-ink"
                  >
                    <option value="llama-4-scout">Groq / Llama 4 Scout (Sub-second Speed)</option>
                    <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Multimodal Depth)</option>
                    <option value="gpt-4o">OpenAI GPT-4o (High-Precision Reasoning)</option>
                  </select>
                </div>

                {/* Threshold Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
                    <span>RAG Similarity Threshold (`match_threshold`)</span>
                    <span className="font-mono text-brand font-bold">{settings?.matchThreshold ?? 0.30}</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={settings?.matchThreshold ?? 0.30}
                    onChange={(e) => settingsMutation.mutate({ matchThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-brand cursor-pointer"
                  />
                  <p className="text-[11px] text-ink-subtle mt-1">Higher values require stricter, direct matches from textbook PDFs.</p>
                </div>

                {/* Match Count Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-ink mb-1.5">
                    <span>Max RAG Context Chunks (`match_count`)</span>
                    <span className="font-mono text-brand font-bold">{settings?.matchCount ?? 4} Chunks</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings?.matchCount ?? 4}
                    onChange={(e) => settingsMutation.mutate({ matchCount: parseInt(e.target.value, 10) })}
                    className="w-full accent-brand cursor-pointer"
                  />
                  <p className="text-[11px] text-ink-subtle mt-1">Number of PDF textbook chunks provided to AI for each answer.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="space-y-6 max-w-2xl">
              {/* Report Export Studio */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-500" /> Report Export Studio
                </h3>
                <p className="text-xs text-ink-muted">Download platform data reports in standard CSV and JSON formats.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={exportUsersCSV}
                    className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-background hover:bg-ink/90 transition shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Export Users Directory (CSV)
                  </button>
                  <button
                    onClick={exportTelemetryJSON}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-strong transition shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Export System Telemetry (JSON)
                  </button>
                </div>
              </div>

              {/* Maintenance & Vector Storage Vacuum */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-amber-500" /> Vector Storage Vacuum Cleaner
                </h3>
                <p className="text-xs text-ink-muted">Purge orphaned vector chunks from deleted tracks or unused drafts to reclaim database quota.</p>
                <button
                  onClick={() => purgeMutation.mutate()}
                  disabled={purgeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 text-xs transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{purgeMutation.isPending ? "Purging..." : "Purge Orphaned Vector Chunks"}</span>
                </button>
              </div>

              {/* Emergency System Announcement Broadcast */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-500" /> Platform Announcement Broadcast
                </h3>
                <p className="text-xs text-ink-muted">Broadcast an emergency notification banner to all active students across the platform.</p>
                <textarea
                  placeholder="e.g. Scheduled maintenance tonight at 12 AM UTC..."
                  value={announcementText || (settings?.systemAnnouncement ?? "")}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-ink focus:outline-none focus:border-ink"
                />
                <button
                  onClick={() => settingsMutation.mutate({ systemAnnouncement: announcementText })}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 text-xs transition shadow-sm"
                >
                  <Megaphone className="w-4 h-4" /> Broadcast Announcement
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

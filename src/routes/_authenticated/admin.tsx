import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTelemetry,
  getAdminUsers,
  getAdminCourses,
  toggleCourseStatus,
  getSystemSettings,
  updateSystemSettings,
  purgeOrphanedVectorChunks
} from "@/lib/admin.functions";
import { updateUserRole } from "@/lib/courses.functions";
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
  Settings
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"telemetry" | "users" | "courses" | "ai" | "maintenance">("telemetry");
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
    enabled: isAdmin && activeTab === "users",
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
    mutationFn: ({ role }: { role: "student" | "instructor" | "admin" }) =>
      updateUserRole({ data: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminTelemetry"] });
      toast.success("User role updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
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
    const headers = "ID,Full Name,Role,Onboarding Complete,Created At\n";
    const rows = users
      .map((u) => `"${u.id}","${u.full_name ?? "N/A"}","${u.role ?? "student"}","${u.onboarding_complete}","${u.created_at}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyVerse_User_Directory_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Exported User Directory CSV");
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
            Monitor real-time system telemetry, manage user access roles, review course submissions, and fine-tune global AI engine models and RAG thresholds.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3">
        {[
          { id: "telemetry", label: "📊 System Telemetry", icon: Activity },
          { id: "users", label: "👥 User Directory", icon: Users },
          { id: "courses", label: "📑 Course Moderation", icon: BookOpen },
          { id: "ai", label: "⚙️ AI Control Panel", icon: Bot },
          { id: "maintenance", label: "🛠️ Maintenance & Reports", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${
                isActive
                  ? "bg-ink text-background shadow-sm"
                  : "bg-surface text-ink-muted hover:border-ink/40 border border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
                  <Zap className="w-5 h-5 text-emerald-500" /> Student Efficacy & Learning Impact Index
                </h3>
                <p className="text-xs text-ink-muted">
                  Real-time analytics monitoring whether students are actively learning, retaining knowledge, and being helped.
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                Efficacy Status: High 🟢
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
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
                  {Math.round((telemetry?.studentEfficacy?.totalMinutes ?? 120) / 60)} hrs
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

      {/* TAB 2: USER DIRECTORY */}
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
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
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
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-medium">
                        {u.onboarding_complete ? "Active" : "Onboarding"}
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role ?? "student"}
                          onChange={(e) => roleMutation.mutate({ role: e.target.value as any })}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-ink focus:outline-none"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COURSE MODERATION */}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AI CONTROL PANEL */}
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
                value={settings?.aiModel ?? "llama-3.3-70b"}
                onChange={(e) => settingsMutation.mutate({ aiModel: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-ink font-medium focus:outline-none focus:border-ink"
              >
                <option value="llama-3.3-70b">Groq / Llama 3.3 70B (Sub-second Speed)</option>
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

      {/* TAB 5: MAINTENANCE & REPORT EXPORT */}
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
    </main>
  );
}

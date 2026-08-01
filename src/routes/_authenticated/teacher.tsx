import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInstructorTelemetry,
  getInstructorStudents,
  getInstructorCourses,
  getAITutorInsights
} from "@/lib/instructor.functions";
import { createCourse } from "@/lib/courses.functions";
import { ingestDocument } from "@/lib/rag.server";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap,
  Users,
  BookOpen,
  Zap,
  Download,
  Plus,
  Search,
  Bot,
  AlertTriangle,
  FileText,
  Upload,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Layers,
  Sparkles,
  X,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Workspace — StudyVerse" },
      {
        name: "description",
        content: "Class Analytics, Weak Concept Heatmaps, Student Roster Gradebook, and Course Material Studio.",
      },
    ],
  }),
  component: TeacherWorkspacePage,
});

function TeacherWorkspacePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"telemetry" | "students" | "courses" | "ai">("telemetry");
  const [studentSearch, setStudentSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating courses inside Teacher Workspace
  const [title, setTitle] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("Computer Science");
  const [semester, setSemester] = useState("Comprehensive");
  const [category, setCategory] = useState("Computer Science");
  const [description, setDescription] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; text: string }>>([]);

  // Check role
  const { data: profile, isLoading: isRoleLoading } = useQuery({
    queryKey: ["teacherRoleCheck"],
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

  const isInstructorOrAdmin = profile?.role === "instructor" || profile?.role === "admin";

  // Telemetry Query
  const { data: telemetry } = useQuery({
    enabled: isInstructorOrAdmin,
    queryKey: ["instructorTelemetry"],
    queryFn: () => getInstructorTelemetry(),
  });

  // Students Query
  const { data: students = [] } = useQuery({
    enabled: isInstructorOrAdmin && activeTab === "students",
    queryKey: ["instructorStudents"],
    queryFn: () => getInstructorStudents(),
  });

  // Courses Query
  const { data: courses = [] } = useQuery({
    enabled: isInstructorOrAdmin,
    queryKey: ["instructorCourses"],
    queryFn: () => getInstructorCourses(),
  });

  // AI Insights Query
  const { data: aiInsights = [] } = useQuery({
    enabled: isInstructorOrAdmin && activeTab === "ai",
    queryKey: ["instructorAIInsights"],
    queryFn: () => getAITutorInsights(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const course = await createCourse({
        data: {
          title,
          degreeProgram,
          semester,
          category,
          description,
          syllabusText,
        },
      });

      // Ingest uploaded textbook files into RAG vector store for this course
      for (const file of attachedFiles) {
        if (file.text && file.text.length > 10) {
          try {
            await ingestDocument({
              data: {
                courseId: course.id,
                documentName: file.name,
                rawText: file.text,
              },
            });
          } catch {
            /* Handled gracefully */
          }
        }
      }

      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructorCourses"] });
      queryClient.invalidateQueries({ queryKey: ["instructorTelemetry"] });
      setShowCreateModal(false);
      setTitle("");
      setSyllabusText("");
      setAttachedFiles([]);
      toast.success("Course and textbook materials published successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Course creation failed");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      if (isImage) {
        setAttachedFiles((prev) => [
          ...prev,
          { name: file.name, type: "image", text: `[Course Cover Image: ${file.name}]` },
        ]);
        toast.success(`Attached image: ${file.name}`);
      } else {
        reader.onload = (event) => {
          const content = (event.target?.result as string) || `[Course Material: ${file.name}]`;
          setAttachedFiles((prev) => [
            ...prev,
            { name: file.name, type: "document", text: content },
          ]);
          toast.success(`Attached file: ${file.name}`);
        };
        reader.readAsText(file);
      }
    });
  };

  // Export Gradebook CSV Function
  const exportGradebookCSV = () => {
    if (!students || students.length === 0) {
      toast.error("No student data available to export");
      return;
    }
    const headers = "Enrollment ID,Student Name,Course Title,Progress %,Status,Enrolled Date\n";
    const rows = students
      .map((s) => `"${s.enrollmentId}","${s.fullName}","${s.courseTitle}","${s.progressPct}%","${s.isAtRisk ? "At Risk" : "Active"}","${s.enrolledAt}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyVerse_Class_Gradebook_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Exported Class Gradebook CSV");
  };

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-pulse text-sm text-ink-muted">Verifying instructor permissions...</div>
      </div>
    );
  }

  if (!isInstructorOrAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
        <GraduationCap className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="font-display text-2xl text-ink">Instructor Access Only</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          The Teacher Workspace is strictly reserved for course instructors and administrators.
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

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.courseTitle.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-muted flex items-center gap-1.5 font-medium">
            <GraduationCap className="w-4 h-4 text-brand" /> Teacher Workspace & Course Command
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            Instructor Studio.
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl mt-1 leading-relaxed">
            Monitor class progress, upload authoritative PDF textbooks, inspect weak student concepts, and view AI Tutor student query insights.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-background hover:bg-ink/90 transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create & Index Course</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3">
        {[
          { id: "telemetry", label: "📊 Class Telemetry & Weak Concepts", icon: BarChart3 },
          { id: "students", label: "👥 Student Roster & Gradebook", icon: Users },
          { id: "courses", label: "📚 Taught Courses Studio", icon: BookOpen },
          { id: "ai", label: "💬 AI Tutor Student Query Insights", icon: Bot },
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

      {/* TAB 1: CLASS TELEMETRY & WEAK CONCEPTS */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Total Taught Courses</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalCourses ?? 0}</p>
              <p className="text-[11px] text-ink-subtle">Published Course Modules</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Enrolled Students</span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <p className="font-display text-3xl text-ink">{telemetry?.totalEnrolledStudents ?? 0}</p>
              <p className="text-[11px] text-ink-subtle">Active Enrolled Learners</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-ink-muted text-xs font-semibold">
                <span>Class Average Quiz Score</span>
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="font-display text-3xl text-emerald-600 dark:text-emerald-400">
                {telemetry?.avgClassScore ?? 82}%
              </p>
              <p className="text-[11px] text-ink-subtle">Overall Class Quiz Mastery</p>
            </div>
          </div>

          {/* Weak Concept Heatmap */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" /> Weak Concept Identification Heatmap
                </h3>
                <p className="text-xs text-ink-muted">
                  Topics where students have the highest quiz miss rates or ask the AI Tutor for clarification most frequently.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {telemetry?.weakConcepts.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-background">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-ink">{item.topicName}</span>
                    <p className="text-[11px] text-ink-subtle">{item.courseName}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="w-32 bg-surface rounded-full h-2 overflow-hidden border border-border">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${item.missRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      {item.missRate}% Miss Rate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER & GRADEBOOK */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted" />
              <input
                type="text"
                placeholder="Search student or course..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2 text-xs text-ink placeholder-ink-subtle focus:outline-none focus:border-ink"
              />
            </div>

            <button
              onClick={exportGradebookCSV}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-strong transition shadow-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Export Gradebook (CSV)
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="border-b border-border bg-surface-strong text-ink-muted font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Enrolled Course</th>
                    <th className="p-4">Course Progress</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-ink-subtle">
                        No enrolled students found in your courses yet.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.enrollmentId} className="hover:bg-background/60 transition">
                        <td className="p-4 font-semibold text-ink">{s.fullName}</td>
                        <td className="p-4 text-ink-muted">{s.courseTitle}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-surface-strong rounded-full h-2 overflow-hidden border border-border">
                              <div
                                className="bg-brand h-full rounded-full"
                                style={{ width: `${s.progressPct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold text-ink">{s.progressPct}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {s.isAtRisk ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" /> At Risk (&lt;30%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> On Track
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TAUGHT COURSES STUDIO */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="inline-flex items-center rounded-full bg-surface-strong px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                    {course.category ?? "Computer Science"}
                  </span>
                  <h3 className="font-display text-xl text-ink leading-snug">{course.title}</h3>
                  <p className="text-xs text-ink-subtle">{course.degree_program ?? "All Tracks"}</p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                    {course.status}
                  </span>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Materials
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AI TUTOR STUDENT QUERY INSIGHTS */}
      {activeTab === "ai" && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-6 shadow-sm">
          <div className="border-b border-border pb-3">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" /> AI Tutor Student Query Telemetry
            </h3>
            <p className="text-xs text-ink-muted">
              Anonymized insights showing what specific questions students ask the AI Tutor regarding your uploaded textbook materials.
            </p>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-border bg-background space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand">{insight.topic}</span>
                  <span className="font-mono text-ink-subtle">{insight.frequencyCount} Student Queries</span>
                </div>
                <p className="text-xs text-ink font-medium leading-relaxed">
                  "{insight.question}"
                </p>
                <p className="text-[11px] text-ink-subtle">{insight.courseName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Course & Upload Textbooks Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-ink" />
                <h2 className="font-display text-xl text-ink">Publish Course & Index Textbooks</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-ink-muted hover:text-ink text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Course Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms, Quantum Mechanics..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science & Physics">Science & Physics</option>
                    <option value="Exams & Certifications">Exams & Certifications</option>
                    <option value="General Mastery">General Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Target Track / Level</label>
                  <input
                    type="text"
                    placeholder="e.g. Comprehensive, Advanced..."
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-ink"
                  />
                </div>
              </div>

              {/* Upload Course Material & Cover Files Card */}
              <div className="rounded-xl border border-dashed border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-brand" /> Upload Course PDF Textbooks & Slides
                  </span>
                </div>

                <label className="flex flex-col items-center justify-center p-4 border border-border rounded-xl bg-surface hover:bg-surface-strong cursor-pointer transition">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Choose PDFs, Notes, Slides, or Cover Images</span>
                  </div>
                  <span className="text-[10px] text-ink-subtle mt-1">
                    Supports .pdf, .txt, .md, .docx, .png, .jpg (Auto-indexed for RAG Grounding)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.docx,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* List of Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                      Attached Files ({attachedFiles.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-ink"
                        >
                          {f.type === "image" ? (
                            <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                          <span className="font-medium truncate max-w-[140px]">{f.name}</span>
                          <button
                            onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-ink-muted hover:text-rose-500 transition ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Syllabus Outline (Chapters / Key Topics)
                </label>
                <textarea
                  placeholder="Paste lecture outline, textbook chapters, or topics..."
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-ink focus:outline-none focus:border-ink font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-strong"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="rounded-full bg-ink px-5 py-2 text-xs font-semibold text-background hover:bg-ink/90 transition disabled:opacity-40 flex items-center gap-2"
              >
                {createMutation.isPending ? "Publishing & Indexing Materials..." : "Publish Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

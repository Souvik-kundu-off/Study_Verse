import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCoursesCatalog, enrollInCourse, createCourse } from "@/lib/courses.functions";
import { ingestDocument } from "@/lib/rag.server";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Search,
  ShieldCheck,
  Bot,
  ArrowRight,
  GraduationCap,
  BookMarked,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  File
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Course Catalog — StudyVerse" },
      {
        name: "description",
        content: "Explore structured courses for all learners — from STEM and competitive exams to self-directed mastery.",
      },
    ],
  }),
  component: CoursesCatalogPage,
});

function CoursesCatalogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state for creating courses
  const [title, setTitle] = useState("");
  const [degreeProgram, setDegreeProgram] = useState("Computer Science");
  const [semester, setSemester] = useState("Comprehensive");
  const [category, setCategory] = useState("Computer Science");
  const [description, setDescription] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; text: string }>>([]);

  // Fetch logged in profile role
  const { data: profile } = useQuery({
    queryKey: ["userProfileRole"],
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

  const currentRole = profile?.role ?? "student";
  const isInstructorOrAdmin = currentRole === "instructor" || currentRole === "admin";

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["coursesCatalog"],
    queryFn: () => getCoursesCatalog(),
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInCourse({ data: { courseId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coursesCatalog"] });
      toast.success("Successfully enrolled in course!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Enrollment failed");
    },
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

      // Ingest uploaded files into RAG vector store for this course
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
      queryClient.invalidateQueries({ queryKey: ["coursesCatalog"] });
      setShowCreateModal(false);
      setTitle("");
      setSyllabusText("");
      setAttachedFiles([]);
      toast.success("Course and textbook documents published!");
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

  const categories = [
    "All",
    "Computer Science",
    "Mathematics",
    "Science & Physics",
    "Exams & Certifications",
    "General Mastery",
  ];

  const filteredCourses = courses.filter((c) => {
    const matchesCategory =
      selectedCategory === "All" ||
      c.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      c.degree_program?.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.degree_program?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:py-12 space-y-8">
      {/* Top Page Header (Consistent with Dashboard) */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <p className="text-sm text-ink-muted flex items-center gap-1.5 font-medium">
            <BookMarked className="w-4 h-4 text-brand" /> Course Directory
          </p>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            Explore Courses.
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl mt-1 leading-relaxed">
            Discover structured learning paths designed for all students and self-learners. Learn with 100% grounded AI Lesson Notes, Universal Animations, Flashcard Decks, and AI Tutor support trained on official course materials.
          </p>
        </div>

        {/* Create Course Action (Only visible to Instructors & Admins) */}
        {isInstructorOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-background hover:bg-ink/90 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Universal Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-ink text-background shadow-sm"
                  : "bg-surface text-ink-muted hover:border-ink/40 border border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-ink-muted" />
          <input
            type="text"
            placeholder="Search courses or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-surface pl-10 pr-4 py-2 text-xs text-ink placeholder-ink-subtle focus:outline-none focus:border-ink transition"
          />
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-4 max-w-lg mx-auto">
          <BookOpen className="w-10 h-10 text-ink-subtle mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display text-lg text-ink">No Courses Found</h3>
            <p className="text-xs text-ink-muted">
              No courses match your selected filter. Explore other categories or create a new course!
            </p>
          </div>
          {isInstructorOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background hover:bg-ink/90 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="group relative rounded-2xl border border-border bg-surface hover:border-ink/30 p-6 transition-all duration-200 shadow-sm flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                {/* Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-surface-strong px-2.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                    {course.category ?? "Computer Science"}
                  </span>
                  <span className="text-[10px] font-medium text-ink-subtle">
                    {course.level ?? "Intermediate"}
                  </span>
                </div>

                {/* Course Title */}
                <h3 className="font-display text-xl text-ink group-hover:text-brand transition leading-snug">
                  {course.title}
                </h3>

                {/* Course Description */}
                <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Course Features Footer */}
              <div className="space-y-4 pt-3 border-t border-border">
                <div className="flex items-center gap-4 text-[11px] text-ink-subtle">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified Materials
                  </span>
                  <span className="flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> AI Personalization
                  </span>
                </div>

                {/* Enrollment Action Button */}
                {course.isEnrolled ? (
                  <button
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold py-2.5 text-xs transition hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Enrolled — Continue Learning
                  </button>
                ) : (
                  <button
                    onClick={() => enrollMutation.mutate(course.id)}
                    disabled={enrollMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink text-background font-semibold py-2.5 text-xs transition hover:bg-ink/90 shadow-sm"
                  >
                    <span>Enroll in Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-ink" />
                <h2 className="font-display text-xl text-ink">Create New Course</h2>
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
                  placeholder="e.g. Data Structures & Algorithms, Quantum Physics, SAT Prep..."
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
                    placeholder="e.g. Comprehensive, Beginner, AP Physics..."
                    value={degreeProgram}
                    onChange={(e) => setDegreeProgram(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Course Description</label>
                <textarea
                  placeholder="Overview of what students will learn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-ink focus:outline-none focus:border-ink"
                />
              </div>

              {/* Upload Course Material & Cover Files Card */}
              <div className="rounded-xl border border-dashed border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-brand" /> Upload Course Files & Textbooks (PDF, Docs, Images)
                  </span>
                </div>

                <label className="flex flex-col items-center justify-center p-4 border border-border rounded-xl bg-surface hover:bg-surface-strong cursor-pointer transition">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Choose PDFs, Notes, Slides, or Cover Images</span>
                  </div>
                  <span className="text-[10px] text-ink-subtle mt-1">
                    Supports .pdf, .txt, .md, .docx, .png, .jpg (Auto-indexed for AI Grounding)
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
                  Syllabus & Learning Outline (Paste Chapters / Topics)
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
                {createMutation.isPending ? "Publishing Course & Indexing Files..." : "Publish Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

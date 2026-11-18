import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateRoadmap } from "@/lib/ai.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Upload, BookOpen, Sun, Moon, Sunrise, Sunset, Zap, Library, GraduationCap, Sparkles } from "lucide-react";
import {
  extractDocumentText,
  INDEXABLE_FILE_ACCEPT,
  isIndexableFile,
} from "@/lib/file-extract";

/** Must match `roadmapInput.syllabusText` in ai.functions.ts. */
const MAX_SYLLABUS_CHARS = 10000;

interface CreateTrackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (goalId: string) => void;
}

const CATEGORIES = [
  "College Subjects",
  "Programming",
  "AI & Machine Learning",
  "Competitive Exams",
  "Languages",
  "Personal Skills",
  "Other",
];

const TIME_SLOTS = [
  { id: "morning", label: "Morning", icon: Sunrise, desc: "Best for complex conceptual study" },
  { id: "afternoon", label: "Afternoon", icon: Sun, desc: "Great for practice and problem solving" },
  { id: "evening", label: "Evening", icon: Sunset, desc: "Good for review and flashcard recall" },
  { id: "night", label: "Night", icon: Moon, desc: "Deep work & uninterrupted focus" },
  { id: "flexible", label: "Flexible", icon: BookOpen, desc: "Study whenever you have free time" },
] as const;

const DEPTH_OPTIONS = [
  { id: "auto", label: "Smart Adaptive", icon: Sparkles, modules: "AI-Decided", desc: "AI autonomously decides module & chapter count based on subject breadth (Recommended)" },
  { id: "comprehensive", label: "Deep Dive", icon: GraduationCap, modules: "10–16+", desc: "Exhaustive mastery with 5–8 in-depth chapters per module (DSA, ML, System Design)" },
  { id: "standard", label: "Standard", icon: Library, modules: "7–10", desc: "University semester course with 4–6 detailed chapters per module" },
  { id: "sprint", label: "Sprint", icon: Zap, modules: "4–6", desc: "Focused crash course for urgent reviews" },
] as const;

export function CreateTrackModal({ open, onOpenChange, onSuccess }: CreateTrackModalProps) {
  const qc = useQueryClient();
  const gen = useServerFn(generateRoadmap);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "syllabus">("ai");

  const [goalTitle, setGoalTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("College Subjects");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [timeSlot, setTimeSlot] = useState<"morning" | "afternoon" | "evening" | "night" | "flexible">("flexible");
  const [syllabusText, setSyllabusText] = useState("");
  const [depth, setDepth] = useState<"auto" | "sprint" | "standard" | "comprehensive">("auto");

  const handleTitleChange = (val: string) => {
    setGoalTitle(val);
    const lower = val.toLowerCase();
    if (
      lower.includes("dsa") ||
      lower.includes("data structure") ||
      lower.includes("algorithm") ||
      lower.includes("system design") ||
      lower.includes("operating system") ||
      lower.includes("machine learning") ||
      lower.includes("gate")
    ) {
      setDepth("comprehensive");
    }
  };

  const [fileFileName, setFileFileName] = useState<string | null>(null);
  const [confirmedSyllabus, setConfirmedSyllabus] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read the selection before clearing the input: the File object stays valid.
    e.target.value = "";

    if (!isIndexableFile({ name: file.name, type: file.type })) {
      toast.error(
        `"${file.name}" can't be read. Attach a PDF, .txt or .md file — export Word or slide files first.`,
      );
      return;
    }

    try {
      const extracted = await extractDocumentText(file);
      const text = extracted.text;
      if (text.trim().length < 10) {
        toast.error(`${file.name} has no readable text.`);
        return;
      }

      // The roadmap generator rejects anything longer, so trim here and say so
      // rather than failing the whole submit later.
      if (text.length > MAX_SYLLABUS_CHARS) {
        setFileFileName(file.name);
        setSyllabusText(text.slice(0, MAX_SYLLABUS_CHARS));
        setConfirmedSyllabus(true);
        toast.warning(
          `Loaded the first ${MAX_SYLLABUS_CHARS.toLocaleString()} characters of ${file.name} — the syllabus field is capped.`,
        );
        return;
      }

      setFileFileName(file.name);
      setSyllabusText(text);
      setConfirmedSyllabus(true);
      toast.success(`Loaded syllabus content from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not read ${file.name}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error("Please enter a subject or goal title");
      return;
    }

    setLoading(true);
    try {
      const res = await gen({
        data: {
          goalTitle: goalTitle.trim(),
          description: description.trim() || undefined,
          category,
          level,
          minutesPerDay,
          timeSlotPreference: timeSlot,
          syllabusText: activeTab === "syllabus" && syllabusText.trim() ? syllabusText.trim() : undefined,
          depth,
        },
      });

      await qc.invalidateQueries({ queryKey: ["goals"] });
      await qc.invalidateQueries({ queryKey: ["activeGoal"] });
      await qc.invalidateQueries({ queryKey: ["dailyMission"] });

      toast.success(`Created new study track: "${goalTitle}"`);
      onOpenChange(false);
      
      // Reset form
      setGoalTitle("");
      setDescription("");
      setSyllabusText("");
      
      if (onSuccess) {
        onSuccess(res.goalId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create study track");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Add New Subject or Study Track
          </DialogTitle>
          <DialogDescription>
            Create a parallel study goal (e.g. DSA at night, Physics in the morning).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Track Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "ai"
                  ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              ⚡ AI Auto-Generated Track
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("syllabus")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === "syllabus"
                  ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              📄 Upload / Paste Custom Syllabus
            </button>
          </div>

          <div>
            <Label htmlFor="goalTitle">Subject / Goal Name</Label>
            <Input
              id="goalTitle"
              placeholder="e.g. Data Structures & Algorithms, Class 12 Physics..."
              value={goalTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="level">Knowledge Level</Label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Curriculum Depth */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Curriculum Depth
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {DEPTH_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = depth === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDepth(opt.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${selected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`} />
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className={`text-[10px] mt-0.5 ${selected ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400"}`}>
                      {opt.modules} modules
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              {DEPTH_OPTIONS.find((d) => d.id === depth)?.desc}
            </p>
          </div>

          {/* Time Slot Preference */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Preferred Study Time Slot
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {TIME_SLOTS.map((slot) => {
                const Icon = slot.icon;
                const selected = timeSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTimeSlot(slot.id as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${selected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`} />
                    <span className="text-xs">{slot.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === "syllabus" && (
            <div className="space-y-3 border p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="syllabusText" className="text-xs font-semibold">
                  Syllabus / Chapter Outline
                </Label>
                <label className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  Attach Notes (PDF, .txt, .md)
                  <input
                    type="file"
                    accept={INDEXABLE_FILE_ACCEPT}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {fileFileName && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-md border border-indigo-200 dark:border-indigo-800 text-xs">
                  <span className="truncate font-medium text-indigo-900 dark:text-indigo-300">
                    📎 File: {fileFileName}
                  </span>
                  {confirmedSyllabus && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Loaded
                    </span>
                  )}
                </div>
              )}

              <Textarea
                id="syllabusText"
                rows={4}
                placeholder="Paste course syllabus, chapters, or table of contents here..."
                value={syllabusText}
                onChange={(e) => {
                  setSyllabusText(e.target.value);
                  if (e.target.value) setConfirmedSyllabus(true);
                }}
                className="text-xs font-mono"
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Notes / Specific Target Exam (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g. Preparing for GATE Exam or Semester finals in Dec"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !goalTitle.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Building Roadmap...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Study Track
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

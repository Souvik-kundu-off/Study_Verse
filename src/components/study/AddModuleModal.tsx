import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { expandRoadmap, addCustomModule } from "@/lib/ai.functions";
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
import { Sparkles, Plus, Loader2, BookOpen } from "lucide-react";

interface AddModuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalTitle: string;
  initialMode?: "ai" | "manual";
}

export function AddModuleModal({
  open,
  onOpenChange,
  goalId,
  goalTitle,
  initialMode = "ai",
}: AddModuleModalProps) {
  const qc = useQueryClient();
  const expandFn = useServerFn(expandRoadmap);
  const addManualFn = useServerFn(addCustomModule);

  const [mode, setMode] = useState<"ai" | "manual">(initialMode);
  const [loading, setLoading] = useState(false);

  // AI Expand state
  const [promptHint, setPromptHint] = useState("");

  // Manual state
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [topicsText, setTopicsText] = useState("");

  const handleAIExpand = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      toast.info("Analyzing curriculum and generating next progressive modules...");
      const res = await expandFn({
        data: {
          goalId,
          promptHint: promptHint.trim() || undefined,
        },
      });

      await qc.invalidateQueries({ queryKey: ["roadmap-full", goalId] });
      await qc.invalidateQueries({ queryKey: ["goal-modules-topics", goalId] });
      await qc.invalidateQueries({ queryKey: ["modules", goalId] });

      toast.success(`Successfully added ${res.addedCount} new modules to "${goalTitle}"!`);
      setPromptHint("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to expand curriculum");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      toast.error("Please enter a module title");
      return;
    }

    const rawTopics = topicsText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (rawTopics.length === 0) {
      toast.error("Please enter at least one topic (one per line)");
      return;
    }

    setLoading(true);
    try {
      await addManualFn({
        data: {
          goalId,
          title: manualTitle.trim(),
          description: manualDesc.trim() || undefined,
          topics: rawTopics,
        },
      });

      await qc.invalidateQueries({ queryKey: ["roadmap-full", goalId] });
      await qc.invalidateQueries({ queryKey: ["goal-modules-topics", goalId] });
      await qc.invalidateQueries({ queryKey: ["modules", goalId] });

      toast.success(`Added module "${manualTitle}" with ${rawTopics.length} topics!`);
      setManualTitle("");
      setManualDesc("");
      setTopicsText("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add module");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Expand Curriculum: {goalTitle}
          </DialogTitle>
          <DialogDescription>
            Add more chapters to deepen mastery or cover advanced topics.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mt-2">
          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              mode === "ai"
                ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            ⚡ AI Deepen Curriculum
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              mode === "manual"
                ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            ✏️ Manual Module
          </button>
        </div>

        {mode === "ai" ? (
          <form onSubmit={handleAIExpand} className="space-y-4 py-2">
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Automatic Subject Audit & Expansion
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The AI will inspect all existing modules in this track, identify missing concept pillars (such as advanced algorithms, design patterns, or case studies), and append 2–4 comprehensive modules with detailed topics.
              </p>
            </div>

            <div>
              <Label htmlFor="promptHint">
                Specific Request / Focus Area <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="promptHint"
                rows={3}
                placeholder="e.g. Focus on Dynamic Programming, Graphs (Dijkstra, MST), and Bit Manipulation, or leave blank for automatic audit..."
                value={promptHint}
                onChange={(e) => setPromptHint(e.target.value)}
                className="mt-1 text-xs"
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
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Expanding Curriculum...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate & Append Modules
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleManualAdd} className="space-y-4 py-2">
            <div>
              <Label htmlFor="manualTitle">Module / Chapter Title</Label>
              <Input
                id="manualTitle"
                placeholder="e.g. Module 6: Graphs & Shortest Path Algorithms"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="manualDesc">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="manualDesc"
                placeholder="e.g. BFS/DFS traversal, Dijkstra, Bellman-Ford, and Prim's MST"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="topicsText">
                Topics <span className="text-slate-400 font-normal">(One topic per line)</span>
              </Label>
              <Textarea
                id="topicsText"
                rows={4}
                placeholder={"Graph Representation (Adjacency Matrix & List)\nBreadth-First Search (BFS)\nDepth-First Search (DFS)\nDijkstra's Shortest Path Algorithm"}
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                required
                className="mt-1 text-xs font-mono"
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
                disabled={loading || !manualTitle.trim() || !topicsText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Module...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

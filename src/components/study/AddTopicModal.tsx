import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addCustomTopic } from "@/lib/ai.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, BookOpen } from "lucide-react";

interface AddTopicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  moduleId: string;
  moduleTitle: string;
}

export function AddTopicModal({
  open,
  onOpenChange,
  goalId,
  moduleId,
  moduleTitle,
}: AddTopicModalProps) {
  const qc = useQueryClient();
  const addTopicFn = useServerFn(addCustomTopic);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a topic title");
      return;
    }

    setLoading(true);
    try {
      await addTopicFn({
        data: {
          goalId,
          moduleId,
          title: title.trim(),
          description: description.trim() || undefined,
          estimatedMinutes: Number(estimatedMinutes) || 30,
        },
      });

      await qc.invalidateQueries({ queryKey: ["roadmap-full", goalId] });
      await qc.invalidateQueries({ queryKey: ["goal-modules-topics", goalId] });

      toast.success(`Added topic "${title}" to ${moduleTitle}`);
      setTitle("");
      setDescription("");
      setEstimatedMinutes(30);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Add Topic to {moduleTitle}
          </DialogTitle>
          <DialogDescription>
            Add an extra concept or sub-topic to this chapter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="topicTitle">Topic Name</Label>
            <Input
              id="topicTitle"
              placeholder="e.g. Dijkstra's Algorithm implementation & edge cases"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="topicDesc">
              Short Summary <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Input
              id="topicDesc"
              placeholder="e.g. Single-source shortest path using priority queue"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="estMin">Estimated Study Time (Minutes)</Label>
            <Input
              id="estMin"
              type="number"
              min={5}
              max={240}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
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
              disabled={loading || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Topic
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

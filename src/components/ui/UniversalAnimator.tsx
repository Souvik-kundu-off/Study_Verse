import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Zap, Info, CheckCircle2 } from "lucide-react";

export type UniversalAnimationData = {
  title: string;
  subject?: "cs" | "math" | "physics" | "chem" | "bio" | "general";
  type: "process_steps" | "graph_network" | "data_bars" | "coordinate_canvas";
  description?: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    keyTakeaway?: string;
    stateVars?: Record<string, string | number>;
    // For process_steps
    activeStageId?: string;
    stages?: Array<{ id: string; label: string; status?: "active" | "completed" | "pending"; color?: string }>;
    // For graph_network
    nodes?: Array<{ id: string; label: string; x: number; y: number; color?: string }>;
    activeNodeId?: string;
    activeEdges?: Array<[string, string]>;
    // For data_bars
    bars?: Array<{ label: string; value: number; color?: string; highlighted?: boolean }>;
    // For coordinate_canvas
    points?: Array<{ x: number; y: number; label?: string }>;
    formulaText?: string;
  }>;
};

export function UniversalAnimator({ data }: { data: UniversalAnimationData | string }) {
  let parsed: UniversalAnimationData | null = null;

  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data.replace(/^```(?:json|animation)?\s*/i, "").replace(/```\s*$/i, ""));
    } catch {
      parsed = null;
    }
  } else {
    parsed = data;
  }

  if (!parsed || !parsed.steps || parsed.steps.length === 0) {
    return null;
  }

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2.0); // seconds per step

  const totalSteps = parsed.steps.length;
  const currentStep = parsed.steps[currentStepIdx];

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, totalSteps, playbackSpeed]);

  const subjectBadge = () => {
    switch (parsed?.subject) {
      case "cs":
        return { label: "💻 Computer Science & Algorithms", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" };
      case "math":
        return { label: "📐 Mathematics & Functions", color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" };
      case "physics":
        return { label: "⚡ Physics & Dynamics", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" };
      case "chem":
        return { label: "🧪 Chemistry & Reactions", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" };
      case "bio":
        return { label: "🧬 Biology & Life Systems", color: "bg-rose-500/20 border-rose-500/40 text-rose-300" };
      default:
        return { label: "🔬 Interactive Simulation Engine", color: "bg-purple-500/20 border-purple-500/40 text-purple-300" };
    }
  };

  const badge = subjectBadge();
  const stateKeys = currentStep.stateVars ? Object.keys(currentStep.stateVars) : [];

  return (
    <div className="my-6 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 p-5 text-white shadow-2xl space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${badge.color}`}>
            {badge.label}
          </span>
          <h4 className="text-sm font-bold text-slate-100">{parsed.title}</h4>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
            <button
              onClick={() => setPlaybackSpeed(2.5)}
              className={`px-2 py-0.5 rounded ${playbackSpeed === 2.5 ? "bg-indigo-600 text-white font-bold" : "text-slate-400"}`}
            >
              Slow
            </button>
            <button
              onClick={() => setPlaybackSpeed(1.5)}
              className={`px-2 py-0.5 rounded ${playbackSpeed === 1.5 ? "bg-indigo-600 text-white font-bold" : "text-slate-400"}`}
            >
              1.5x
            </button>
            <button
              onClick={() => setPlaybackSpeed(0.8)}
              className={`px-2 py-0.5 rounded ${playbackSpeed === 0.8 ? "bg-indigo-600 text-white font-bold" : "text-slate-400"}`}
            >
              Fast
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setCurrentStepIdx((s) => Math.max(0, s - 1))}
              disabled={currentStepIdx === 0}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition text-slate-300"
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded text-xs transition shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={() => setCurrentStepIdx((s) => Math.min(totalSteps - 1, s + 1))}
              disabled={currentStepIdx === totalSteps - 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition text-slate-300"
              title="Next Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIdx(0);
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 transition text-slate-300"
              title="Reset Simulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Step Timeline Progress Bar */}
      <div className="flex items-center gap-1.5 py-1">
        {parsed.steps.map((st, idx) => (
          <button
            key={idx}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIdx(idx);
            }}
            className={`flex-1 h-2 rounded-full transition-all ${
              idx === currentStepIdx
                ? "bg-indigo-500 shadow-md shadow-indigo-500/50 scale-y-125"
                : idx < currentStepIdx
                ? "bg-indigo-900/80"
                : "bg-slate-800"
            }`}
            title={`Step ${idx + 1}: ${st.title}`}
          />
        ))}
      </div>

      {/* Live State Variables Bar (If available) */}
      {stateKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl text-xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-indigo-400" /> Live State Variables:
          </span>
          {stateKeys.map((key) => (
            <div key={key} className="flex items-center gap-1.5 rounded-md bg-slate-900 border border-slate-800 px-2.5 py-1 font-mono">
              <span className="text-slate-400">{key}:</span>
              <span className="font-bold text-emerald-400">{String(currentStep.stateVars![key])}</span>
            </div>
          ))}
        </div>
      )}

      {/* Visual Canvas Rendering Frame */}
      <div className="relative min-h-[230px] rounded-xl bg-slate-950 border border-slate-800/80 p-6 flex flex-col items-center justify-center overflow-hidden">
        {/* Render Mode 1: Process / Workflow Steps (Bio cycles, Chemistry reactions, CS flow) */}
        {parsed.type === "process_steps" && currentStep.stages && (
          <div className="w-full flex flex-wrap items-center justify-center gap-3 py-4">
            {currentStep.stages.map((stage, idx) => {
              const isActive = stage.id === currentStep.activeStageId || idx === currentStepIdx;
              return (
                <div key={stage.id} className="flex items-center gap-2">
                  <div
                    className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-500 transform ${
                      isActive
                        ? "bg-indigo-600 border-indigo-400 text-white scale-110 shadow-lg shadow-indigo-500/40"
                        : "bg-slate-900 border-slate-800 text-slate-400 opacity-60"
                    }`}
                  >
                    <span className="text-[10px] opacity-70 mr-1.5">Step {idx + 1}:</span>
                    {stage.label}
                  </div>
                  {idx < currentStep.stages!.length - 1 && (
                    <ChevronRight className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Render Mode 2: Graph Network / Nodes & Traversal (CS TSP, Bio food webs, Physics circuits) */}
        {parsed.type === "graph_network" && currentStep.nodes && (
          <div className="relative w-full h-[210px] max-w-lg mx-auto border border-slate-800/50 rounded-xl bg-slate-900/40 p-2">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {currentStep.activeEdges?.map(([fromId, toId], i) => {
                const fromNode = currentStep.nodes!.find((n) => n.id === fromId);
                const toNode = currentStep.nodes!.find((n) => n.id === toId);
                if (!fromNode || !toNode) return null;
                return (
                  <line
                    key={i}
                    x1={`${fromNode.x}%`}
                    y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`}
                    y2={`${toNode.y}%`}
                    stroke="#818cf8"
                    strokeWidth="3"
                    strokeDasharray="6"
                    className="animate-pulse"
                  />
                );
              })}
            </svg>
            {currentStep.nodes.map((node) => {
              const isActive = node.id === currentStep.activeNodeId;
              return (
                <div
                  key={node.id}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-full border text-xs font-extrabold transition-all duration-500 shadow-md ${
                    isActive
                      ? "bg-indigo-600 border-indigo-300 text-white scale-125 shadow-indigo-500/50 z-10"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                  }`}
                >
                  {node.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Render Mode 3: Data Bars / Sorting / Histograms */}
        {parsed.type === "data_bars" && currentStep.bars && (
          <div className="w-full flex items-end justify-center gap-3 h-[180px] pt-6 px-4">
            {currentStep.bars.map((bar, idx) => (
              <div key={idx} className="flex-1 max-w-[56px] flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-bold text-slate-300">{bar.value}</span>
                <div
                  style={{ height: `${Math.min(100, Math.max(15, bar.value))}%` }}
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    bar.highlighted
                      ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/40"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                />
                <span className="text-[10px] text-slate-400 truncate w-full text-center font-mono">{bar.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Render Mode 4: Coordinate Canvas / Physics Trajectory / Calculus Curves */}
        {parsed.type === "coordinate_canvas" && (
          <div className="w-full flex flex-col items-center justify-center space-y-3 py-4">
            {currentStep.formulaText && (
              <div className="px-4 py-1.5 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-mono shadow-inner">
                {currentStep.formulaText}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {currentStep.points?.map((pt, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {pt.label ?? `Point ${i + 1}`}: ({pt.x}, {pt.y})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Footer Step Explanation & Key Takeaway Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-indigo-400 border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5 text-sm">
            <Info className="w-4 h-4 text-indigo-400" />
            Step {currentStep.stepNumber ?? currentStepIdx + 1} of {totalSteps}: {currentStep.title}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {Math.round(((currentStepIdx + 1) / totalSteps) * 100)}% Complete
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed pl-1">{currentStep.description}</p>

        {currentStep.keyTakeaway && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 p-2.5 text-xs text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider block">Key Insight:</span>
              <span>{currentStep.keyTakeaway}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  X,
  Move,
  Copy,
  Check,
  AlertTriangle
} from "lucide-react";

/**
 * Robustly cleans and fixes common LLM syntax slip-ups before passing into Mermaid parser.
 */
function sanitizeMermaid(chart: string, aggressive = false): string {
  let clean = chart.trim();

  // Strip markdown code fences if present
  clean = clean.replace(/^```(?:mermaid)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  // Fix broken dotted arrows like .-> or ..> into standard -.->
  clean = clean.replace(/([^\-\s])\s*\.->\s*/g, "$1 -.-> ");
  clean = clean.replace(/([^\-\s])\s*\.\.>\s*/g, "$1 -.-> ");
  clean = clean.replace(/\s+\.->\s+/g, " -.-> ");
  clean = clean.replace(/\s+\.\.>\s+/g, " -.-> ");

  // Fix unquoted node text with colons or parentheses inside square brackets:
  // e.g. Op1[Enqueue: O(1)] => Op1["Enqueue: O(1)"]
  clean = clean.replace(/(\w+)\[([^"\]\n]*[\(\):][^"\]\n]*)\]/g, '$1["$2"]');

  // Fix unquoted round nodes with colons:
  // e.g. A(Step 1: Init) => A("Step 1: Init")
  clean = clean.replace(/(\w+)\(([^"\)\n]*[:][^"\)\n]*)\)/g, '$1("$2")');

  // If aggressive recovery is requested:
  if (aggressive) {
    // Quote any remaining unquoted bracket texts
    clean = clean.replace(/(\w+)\[([^"\]\n]+)\]/g, '$1["$2"]');
    // Remove direct edges from subgraph identifiers to nodes if problematic
    clean = clean.replace(/^(\s*\w+)\s*-->\s*(\w+)\s*$/gm, (match, p1, p2) => {
      if (clean.includes(`subgraph ${p1.trim()}`)) {
        return `%% ${match} (subgraph edge bypassed)`;
      }
      return match;
    });
  }

  // Ensure diagram starts with a valid directive
  const validStarts = [
    "graph",
    "flowchart",
    "sequencediagram",
    "classdiagram",
    "statediagram",
    "erdiagram",
    "pie",
    "gitgraph",
    "mindmap",
    "timeline",
    "quadrantchart",
    "c4context"
  ];
  const firstLine = clean.split("\n")[0].trim().toLowerCase();
  const hasValidStart = validStarts.some((s) => firstLine.startsWith(s));
  if (!hasValidStart) {
    clean = "flowchart TD\n" + clean;
  }

  return clean;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Lightbox Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;
    const rawChart = chart?.trim() ?? "";
    if (!rawChart) return;

    import("mermaid")
      .then(async (m) => {
        const mermaid = m.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "Inter, sans-serif",
          suppressErrorRendering: true,
        });

        const tryRender = async (chartCode: string): Promise<string | null> => {
          try {
            const valid = await mermaid.parse(chartCode).catch(() => false);
            if (!valid) return null;
            const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
            const res = await mermaid.render(uniqueId, chartCode);
            return res.svg;
          } catch {
            return null;
          }
        };

        // Pass 1: Standard sanitization
        const sanitized = sanitizeMermaid(rawChart, false);
        let renderedSvg = await tryRender(sanitized);

        // Pass 2: Aggressive sanitization fallback
        if (!renderedSvg) {
          const aggressive = sanitizeMermaid(rawChart, true);
          renderedSvg = await tryRender(aggressive);
        }

        // Pass 3: Raw chart as-is fallback
        if (!renderedSvg) {
          renderedSvg = await tryRender(rawChart);
        }

        // Clean up any rogue error DOM artifacts mermaid might inject
        const errorElements = document.querySelectorAll("[id^='dmermaid'], .error-icon, .error-text");
        errorElements.forEach((el) => el.remove());

        if (isMounted) {
          if (renderedSvg) {
            setSvg(renderedSvg);
            setError(false);
          } else {
            setError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Handle Zoom and Pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.25), 4));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only main left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard escape handler for modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.25));
      if (e.key === "0") resetTransform();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write ignored */
    }
  };

  if (error || !chart || !chart.trim()) {
    return (
      <div className="my-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
        <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2 mb-2 text-rose-800 font-bold">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Flowchart Syntax Notice (Raw Code)</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-200 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 p-3 text-emerald-300 font-mono text-[11px]">
          <pre>{chart}</pre>
        </div>
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  return (
    <>
      {/* Inline Preview Card */}
      <div className="group relative my-6 rounded-2xl border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-5 shadow-xs hover:border-indigo-500/40 transition-all">
        {/* Header with Title & Action Controls */}
        <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              📊 Visual Concept Flowchart
            </span>
          </div>
          <button
            onClick={() => {
              resetTransform();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold transition shadow-xs cursor-pointer hover:scale-102"
            title="Open Interactive Fullscreen Zoom & Pan View"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Open Zoom View</span>
          </button>
        </div>

        {/* Diagram Graphic Area (Clickable to open Lightbox) */}
        <div
          onClick={() => {
            resetTransform();
            setIsModalOpen(true);
          }}
          className="relative overflow-x-auto p-4 flex justify-center bg-white/90 dark:bg-slate-950/70 rounded-xl border border-indigo-100 dark:border-slate-800 cursor-zoom-in group/canvas transition-all"
          title="Click to expand, zoom in, and pan"
        >
          <div
            ref={containerRef}
            className="w-full flex justify-center transition-transform group-hover/canvas:scale-[1.01]"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity bg-slate-900/80 text-white text-[10px] px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1">
            <Maximize2 className="h-2.5 w-2.5" /> Click to zoom & pan
          </div>
        </div>
      </div>

      {/* Interactive Lightbox Modal (Same-Screen Dialog with Zoom & Pan) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onMouseUp={handleMouseUp}
        >
          {/* Top Control Bar */}
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-wide">
                📊 Visual Flowchart Explorer
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md">
                Scroll wheel to zoom • Click & drag to pan
              </span>
            </div>

            {/* Zoom & Pan Toolbar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-800/90 border border-slate-700 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-2.5 py-0.5 font-mono text-[11px] text-slate-200 min-w-14 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                  className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={resetTransform}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                title="Reset Zoom & Pan (0)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl bg-slate-800 hover:bg-rose-600 p-1.5 text-slate-200 hover:text-white transition cursor-pointer ml-2"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Interactive Infinite Canvas Area */}
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onDoubleClick={resetTransform}
            className={`relative flex-1 overflow-hidden select-none flex items-center justify-center ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.12s ease-out",
              }}
              className="max-w-none max-h-none p-12 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svg }}
            />

            {/* Bottom Help Tooltip Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg backdrop-blur-sm pointer-events-none">
              <Move className="h-3 w-3 text-indigo-400" />
              <span>Drag to move • Scroll to zoom • Double-click to center</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

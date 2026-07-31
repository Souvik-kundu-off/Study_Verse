import { useEffect, useRef, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const cleanChart = chart?.trim() ?? "";
    if (!cleanChart) return;

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

        try {
          // Parse syntax first to avoid invalid rendering
          const valid = await mermaid.parse(cleanChart).catch(() => false);
          if (!valid) {
            if (isMounted) setError(true);
            return;
          }

          const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          const result = await mermaid.render(uniqueId, cleanChart);
          if (isMounted) {
            setSvg(result.svg);
            setError(false);
          }
        } catch {
          // Clean up any error elements inserted by Mermaid into body
          const errorElements = document.querySelectorAll("[id^='dmermaid'], .error-icon, .error-text");
          errorElements.forEach((el) => el.remove());
          if (isMounted) setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error || !chart || !chart.trim()) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs font-mono text-emerald-400">
        <pre>{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return null;
  }

  return (
    <div className="my-6 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-indigo-200/50 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
          📊 Visual Concept Flowchart & Mindmap
        </span>
      </div>
      <div
        ref={containerRef}
        className="overflow-x-auto p-4 flex justify-center bg-white/80 dark:bg-slate-950/60 rounded-xl border border-indigo-100 dark:border-slate-800"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

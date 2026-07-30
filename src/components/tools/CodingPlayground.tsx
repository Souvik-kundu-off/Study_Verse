import { useState } from "react";
import { Play, Sparkles, Code2, Copy, Check } from "lucide-react";

export function CodingPlayground({
  initialCode = `// StudyVerse Coding Sandbox
function solveProblem() {
  console.log("Hello StudyVerse AI Operating System!");
}

solveProblem();`,
}: {
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function runCode() {
    setOutput(null);
    const logs: string[] = [];
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")),
      error: (...args: unknown[]) => logs.push("ERROR: " + args.join(" ")),
      warn: (...args: unknown[]) => logs.push("WARN: " + args.join(" ")),
    };

    try {
      const runFn = new Function("console", code);
      runFn(customConsole);
      setOutput(logs.length > 0 ? logs.join("\n") : "Code executed successfully (no output).");
    } catch (e) {
      setOutput(`Runtime Error: ${(e as Error).message}`);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex items-center justify-between pb-2 text-xs text-ink-subtle">
        <span className="inline-flex items-center gap-1">
          <Code2 className="h-3.5 w-3.5" /> JavaScript Sandbox
        </span>
        <button onClick={handleCopy} className="inline-flex items-center gap-1 hover:text-ink">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy Code"}
        </button>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        placeholder="Type code here..."
        className="w-full resize-none rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-ink focus:outline-none"
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={runCode}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-background transition hover:opacity-90"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Run Code
        </button>
      </div>

      {output !== null && (
        <div className="mt-4 rounded-xl border border-border bg-slate-900 p-4 text-xs font-mono text-slate-200">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Output Console:</p>
          <pre className="whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}

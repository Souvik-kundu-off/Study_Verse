import React from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { UniversalAnimator } from "./UniversalAnimator";

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Cleanly renders study notes and AI content into publication-grade typography,
 * stripping raw markdown symbols and rendering crisp, high-contrast Slate-900 text.
 */
export function FormattedText({ content, className = "" }: FormattedTextProps) {
  if (!content) return null;

  // Split lines into structured elements
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="my-3 space-y-2.5 pl-2 text-slate-900">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed flex items-start gap-2.5 text-slate-900 font-normal">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span className="flex-1 text-slate-900">{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const flushCode = (keyPrefix: string) => {
    if (codeBuffer.length > 0) {
      const codeText = codeBuffer.join("\n");
      if (codeLang.includes("mermaid")) {
        elements.push(<MermaidDiagram key={`${keyPrefix}-mermaid`} chart={codeText} />);
      } else if (codeLang.includes("anim") || codeLang.includes("simulation")) {
        elements.push(<UniversalAnimator key={`${keyPrefix}-anim`} data={codeText} />);
      } else {
        elements.push(
          <div key={`${keyPrefix}-code`} className="my-4 overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-emerald-300 shadow-xs">
            <pre>{codeText}</pre>
          </div>
        );
      }
      codeBuffer = [];
      codeLang = "";
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCode(`code-${index}`);
        inCodeBlock = false;
      } else {
        flushList(`before-code-${index}`);
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, "").trim().toLowerCase();
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Bullet points (+, -, *, numbered)
    if (/^[-+*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const cleanItem = trimmed.replace(/^[-+*]\s+|\d+\.\s+/, "");
      listBuffer.push(cleanItem);
      return;
    } else {
      flushList(`list-${index}`);
    }

    // Empty lines
    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    // Catch ANY Heading (1 to 6 hashes)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${index}`} className="mt-6 mb-3 text-2xl font-extrabold tracking-tight text-slate-900 border-b border-slate-200 pb-2">
            {renderInlineFormatting(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${index}`} className="mt-5 mb-2.5 text-xl font-bold text-blue-700">
            {renderInlineFormatting(headingText)}
          </h2>
        );
      } else if (level === 3 || level === 4) {
        elements.push(
          <div key={`h4-${index}`} className="mt-5 mb-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3.5 py-2 border-l-4 border-blue-600">
            <h3 className="text-sm font-extrabold tracking-wide text-blue-950 uppercase">
              {renderInlineFormatting(headingText)}
            </h3>
          </div>
        );
      } else {
        elements.push(
          <h4 key={`h-${index}`} className="mt-4 mb-2 text-sm font-bold text-slate-900">
            {renderInlineFormatting(headingText)}
          </h4>
        );
      }
      return;
    }

    // Callout quote box
    if (trimmed.startsWith("> ")) {
      const quote = trimmed.replace(/^>\s+/, "");
      elements.push(
        <div key={`quote-${index}`} className="my-3 rounded-xl border-l-4 border-blue-600 bg-blue-50/80 p-3.5 text-xs text-blue-950 font-medium">
          {renderInlineFormatting(quote)}
        </div>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${index}`} className="my-2.5 text-sm leading-relaxed text-slate-900 font-normal">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList("end");
  flushCode("end");

  return <div className={`formatted-text font-sans ${className}`}>{elements}</div>;
}

/**
 * Renders bold/italic/code inline with crisp Slate-900 contrast
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-extrabold text-slate-950 bg-amber-100/60 px-1 py-0.5 rounded">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-blue-800 font-bold border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-slate-900 font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

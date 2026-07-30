import React from "react";

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Cleanly renders study notes and AI content into publication-grade typography,
 * stripping ALL raw markdown symbols (#, ##, ###, ####, **, +, *) and rendering elegant UI cards & sections.
 */
export function FormattedText({ content, className = "" }: FormattedTextProps) {
  if (!content) return null;

  // Split lines into structured elements
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="my-3 space-y-2 pl-4 text-slate-700 dark:text-slate-300">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <span className="flex-1">{renderInlineFormatting(item)}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const flushCode = (keyPrefix: string) => {
    if (codeBuffer.length > 0) {
      elements.push(
        <div key={`${keyPrefix}-code`} className="my-4 overflow-x-auto rounded-xl bg-slate-900 border border-slate-800 p-4 text-xs font-mono text-emerald-400 shadow-sm">
          <pre>{codeBuffer.join("\n")}</pre>
        </div>
      );
      codeBuffer = [];
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

    // Catch ANY Heading (1 to 6 hashes, e.g. #, ##, ###, ####, #####)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${index}`} className="mt-6 mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
            {renderInlineFormatting(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${index}`} className="mt-5 mb-2.5 text-xl font-semibold text-indigo-700 dark:text-indigo-400">
            {renderInlineFormatting(headingText)}
          </h2>
        );
      } else if (level === 3 || level === 4) {
        elements.push(
          <div key={`h4-${index}`} className="mt-6 mb-3 flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 border-l-4 border-indigo-500">
            <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 uppercase">
              {renderInlineFormatting(headingText)}
            </h3>
          </div>
        );
      } else {
        elements.push(
          <h4 key={`h-${index}`} className="mt-4 mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
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
        <div key={`quote-${index}`} className="my-3 rounded-r-lg border-l-4 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 text-xs text-indigo-900 dark:text-indigo-200">
          {renderInlineFormatting(quote)}
        </div>
      );
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${index}`} className="my-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList("end");
  flushCode("end");

  return <div className={`formatted-text font-sans ${className}`}>{elements}</div>;
}

/**
 * Strips raw markdown asterisks/backticks and renders bold/italic/code inline
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  // Split by bold (**text**), code (`text`), or italic (*text*)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

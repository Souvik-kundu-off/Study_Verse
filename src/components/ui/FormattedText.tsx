import React, { useState } from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { UniversalAnimator } from "./UniversalAnimator";
import { Copy, Check } from "lucide-react";

interface FormattedTextProps {
  content: string;
  className?: string;
}

function CodeBlockViewer({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-1.5 text-[11px] font-mono text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-slate-300">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-xs font-mono text-emerald-300 leading-relaxed">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

/**
 * Cleanly renders study notes and AI content into publication-grade typography,
 * stripping raw markdown artifacts (stars, hashes, pipes) and rendering crisp,
 * high-contrast Slate-900 typography, tables, flowcharts, and animations.
 */
export function FormattedText({ content, className = "" }: FormattedTextProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer: string[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let inDetails = false;
  let detailsSummary = "";
  let detailsBuffer: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="my-3 space-y-2 pl-2 text-slate-900">
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

  const flushTable = (keyPrefix: string) => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer
        .map((row) =>
          row
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim())
        )
        .filter((row) => row.length > 0);

      // Check if second row is a separator (e.g. ---|---|---)
      const hasSeparator =
        rows.length > 1 && rows[1].every((cell) => /^[-:\s]+$/.test(cell));

      const headerRow = hasSeparator ? rows[0] : null;
      const dataRows = hasSeparator ? rows.slice(2) : rows;

      if (rows.length > 0) {
        elements.push(
          <div
            key={`${keyPrefix}-table`}
            className="my-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs"
          >
            <table className="w-full text-left text-xs border-collapse">
              {headerRow && (
                <thead className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-900">
                  <tr>
                    {headerRow.map((h, i) => (
                      <th key={i} className="px-4 py-2.5 font-extrabold uppercase tracking-wider text-[11px] text-slate-800">
                        {renderInlineFormatting(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                {dataRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-50/70 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 leading-relaxed text-slate-800">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    }
  };

  const flushDetails = (keyPrefix: string) => {
    if (inDetails && (detailsSummary || detailsBuffer.length > 0)) {
      elements.push(
        <details
          key={`${keyPrefix}-details`}
          className="my-3.5 overflow-hidden rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-4 transition-all shadow-2xs group"
        >
          <summary className="cursor-pointer font-bold text-indigo-950 select-none flex items-center gap-2 hover:text-indigo-700">
            <span className="text-base select-none">💡</span>
            <span>{renderInlineFormatting(detailsSummary || "Click to Reveal Solution & In-Depth Explanation")}</span>
          </summary>
          <div className="mt-3 pt-3 border-t border-indigo-100/90 text-sm leading-relaxed text-slate-800 space-y-2">
            {detailsBuffer.map((dl, dli) => (
              <p key={dli} className="text-slate-800 leading-relaxed">
                {renderInlineFormatting(dl)}
              </p>
            ))}
          </div>
        </details>
      );
      inDetails = false;
      detailsSummary = "";
      detailsBuffer = [];
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
          <CodeBlockViewer key={`${keyPrefix}-code`} code={codeText} lang={codeLang} />
        );
      }
      codeBuffer = [];
      codeLang = "";
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 0. Details / Collapsible Block (<details><summary>...</summary>...</details>)
    if (trimmed.startsWith("<details")) {
      flushList(`details-start-${index}`);
      flushTable(`details-start-table-${index}`);
      inDetails = true;
      detailsSummary = "";
      detailsBuffer = [];
      return;
    }
    if (trimmed.includes("</details>")) {
      flushDetails(`details-end-${index}`);
      return;
    }
    if (inDetails) {
      if (trimmed.includes("<summary>")) {
        const sumMatch = trimmed.match(/<summary>(.*?)<\/summary>/i) || trimmed.match(/<summary>(.*)/i);
        if (sumMatch) {
          detailsSummary = sumMatch[1].replace(/<\/summary>/i, "").trim();
        }
        return;
      }
      detailsBuffer.push(line);
      return;
    }

    // 1. Code Block Fence
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCode(`code-${index}`);
        inCodeBlock = false;
      } else {
        flushList(`before-code-${index}`);
        flushTable(`before-code-table-${index}`);
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, "").trim().toLowerCase();
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // 2. Table Rows (| col 1 | col 2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|")) {
      flushList(`table-flush-list-${index}`);
      tableBuffer.push(trimmed);
      return;
    } else {
      flushTable(`table-flush-${index}`);
    }

    // 3. Bullet points (+, -, *, or numbered lists)
    if (/^[-+*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const cleanItem = trimmed.replace(/^[-+*]\s+|\d+\.\s+/, "");
      listBuffer.push(cleanItem);
      return;
    } else {
      flushList(`list-${index}`);
    }

    // 4. Horizontal Rules (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${index}`} className="my-6 border-slate-200" />);
      return;
    }

    // 5. Empty Lines
    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    // 6. Headings (supports '# Heading' or '###Heading')
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Strip outer bold marks if LLM produced '### **Heading**'
      const cleanHeading = headingMatch[2]
        .replace(/^[\s*#]+/, "")
        .replace(/[*#\s]+$/, "");
      const anchorId = cleanHeading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (level === 1) {
        elements.push(
          <h1 id={anchorId} key={`h1-${index}`} className="mt-6 mb-3 text-2xl font-extrabold tracking-tight text-slate-900 border-b border-slate-200 pb-2 scroll-mt-24">
            {renderInlineFormatting(cleanHeading)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 id={anchorId} key={`h2-${index}`} className="mt-5 mb-2.5 text-xl font-bold text-blue-700 scroll-mt-24">
            {renderInlineFormatting(cleanHeading)}
          </h2>
        );
      } else if (level === 3 || level === 4) {
        elements.push(
          <div id={anchorId} key={`h3-${index}`} className="mt-5 mb-3 flex items-center gap-2 rounded-xl bg-blue-50/80 px-3.5 py-2 border-l-4 border-blue-600 scroll-mt-24">
            <h3 className="text-sm font-extrabold tracking-wide text-blue-950 uppercase">
              {renderInlineFormatting(cleanHeading)}
            </h3>
          </div>
        );
      } else {
        elements.push(
          <h4 id={anchorId} key={`h4-${index}`} className="mt-4 mb-2 text-sm font-bold text-slate-900 scroll-mt-24">
            {renderInlineFormatting(cleanHeading)}
          </h4>
        );
      }
      return;
    }

    // 7. Semantic Callout Blockquote (> text)
    if (trimmed.startsWith(">")) {
      const quote = trimmed.replace(/^>+\s*/, "");
      const lower = quote.toLowerCase();

      let borderStyle = "border-blue-600 bg-blue-50/80 text-blue-950";
      let icon = "📌";

      if (quote.includes("⚠️") || lower.includes("warning") || lower.includes("pitfall") || lower.includes("trap") || lower.includes("caution")) {
        borderStyle = "border-amber-500 bg-amber-50/90 text-amber-950";
        icon = "⚠️";
      } else if (quote.includes("💡") || lower.includes("pro tip") || lower.includes("tip:") || lower.includes("insight")) {
        borderStyle = "border-emerald-500 bg-emerald-50/90 text-emerald-950";
        icon = "💡";
      } else if (quote.includes("🎯") || lower.includes("exam") || lower.includes("interview") || lower.includes("test tip")) {
        borderStyle = "border-purple-500 bg-purple-50/90 text-purple-950";
        icon = "🎯";
      }

      elements.push(
        <div key={`quote-${index}`} className={`my-3.5 flex items-start gap-2.5 rounded-xl border-l-4 ${borderStyle} p-3.5 text-xs font-medium leading-relaxed shadow-2xs`}>
          <span className="text-sm select-none shrink-0">{icon}</span>
          <div className="flex-1">{renderInlineFormatting(quote.replace(/^[⚠️💡🎯📌]\s*/, ""))}</div>
        </div>
      );
      return;
    }

    // 8. Standard Paragraph
    elements.push(
      <p key={`p-${index}`} className="my-2.5 text-sm leading-relaxed text-slate-900 font-normal">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList("end");
  flushTable("end");
  flushCode("end");
  flushDetails("end");

  return <div className={`formatted-text font-sans ${className}`}>{elements}</div>;
}

/**
 * Robustly renders bold, italic, strikethrough, inline code, and links into crisp elements.
 */
export function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  // Pattern matches:
  // 1. Links: [Label](url)
  // 2. Inline Code: `code`
  // 3. Bold & Italic: ***text***
  // 4. Bold: **text** or __text__
  // 5. Italic: *text* or _text_
  // 6. Strikethrough: ~~text~~
  const tokenRegex =
    /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|~~[^~]+~~)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Link: [Label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-blue-800 font-semibold border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold & Italic: ***text***
    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      return (
        <strong key={i} className="font-extrabold italic text-slate-950">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      return (
        <strong key={i} className="font-extrabold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      return (
        <em key={i} className="italic text-slate-900 font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={i} className="line-through text-slate-500">
          {part.slice(2, -2)}
        </del>
      );
    }

    return part;
  });
}

/**
 * Reusable inline markdown renderer for badges, cards, and modal explanations.
 */
export function MarkdownInline({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text) return null;
  return <span className={className}>{renderInlineFormatting(text)}</span>;
}

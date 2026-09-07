import React from "react";
import { MermaidDiagram } from "./MermaidDiagram";
import { UniversalAnimator } from "./UniversalAnimator";

interface FormattedTextProps {
  content: string;
  className?: string;
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

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${index}`} className="mt-6 mb-3 text-2xl font-extrabold tracking-tight text-slate-900 border-b border-slate-200 pb-2">
            {renderInlineFormatting(cleanHeading)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${index}`} className="mt-5 mb-2.5 text-xl font-bold text-blue-700">
            {renderInlineFormatting(cleanHeading)}
          </h2>
        );
      } else if (level === 3 || level === 4) {
        elements.push(
          <div key={`h3-${index}`} className="mt-5 mb-3 flex items-center gap-2 rounded-xl bg-blue-50/80 px-3.5 py-2 border-l-4 border-blue-600">
            <h3 className="text-sm font-extrabold tracking-wide text-blue-950 uppercase">
              {renderInlineFormatting(cleanHeading)}
            </h3>
          </div>
        );
      } else {
        elements.push(
          <h4 key={`h4-${index}`} className="mt-4 mb-2 text-sm font-bold text-slate-900">
            {renderInlineFormatting(cleanHeading)}
          </h4>
        );
      }
      return;
    }

    // 7. Callout Blockquote (> text)
    if (trimmed.startsWith(">")) {
      const quote = trimmed.replace(/^>+\s*/, "");
      elements.push(
        <div key={`quote-${index}`} className="my-3 rounded-xl border-l-4 border-blue-600 bg-blue-50/80 p-3.5 text-xs text-blue-950 font-medium leading-relaxed">
          {renderInlineFormatting(quote)}
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

/**
 * Client-side document text extraction for uploads.
 *
 * Before this existed, every upload path used `FileReader.readAsText` and
 * rejected anything that was not plain text, so the product could not index a
 * PDF while its UI advertised "textbooks & lecture PDFs". This module extracts
 * text (and keeps real page boundaries so citations are honest) for the
 * formats we can actually parse:
 *
 *  - `.pdf`                → one string per page, via pdf.js
 *  - `.txt`, `.md`         → one string, no page boundaries
 *
 * Everything else is refused explicitly rather than decoded into mojibake.
 */

import { findBinaryContentReason, isPlainTextFile, unsupportedFileMessage } from "@/lib/text-guard";

/** Text extracted from one uploaded file. */
export interface ExtractedDocument {
  name: string;
  /** Full extracted text, used for validation and for the server payload. */
  text: string;
  /**
   * One entry per source page when the format has page boundaries. Chunks
   * derived from these pages can carry a real page number; plain text has none.
   */
  pages?: string[];
}

/** Upper bound on pages parsed per PDF, to keep browser memory bounded. */
const MAX_PDF_PAGES = 300;

export function isPdfFile(file: { name: string; type: string }): boolean {
  return file.type.toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** True when {@link extractDocumentText} can handle this file. */
export function isIndexableFile(file: { name: string; type: string }): boolean {
  return isPdfFile(file) || isPlainTextFile(file);
}

/** Acceptance list for `<input type="file">`, kept next to the parser. */
export const INDEXABLE_FILE_ACCEPT = ".pdf,.txt,.md,.markdown";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.readAsText(file);
  });
}

type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsPromise: Promise<PdfJsModule> | null = null;

/**
 * Loads pdf.js lazily. It touches browser-only globals at import time, so it
 * must never run during SSR — and most sessions never open a PDF, so there is
 * no reason to ship it in the initial bundle.
 */
async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Vite emits the worker as a hashed asset and hands back its URL.
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })().catch((error) => {
      // Let a later attempt retry instead of caching the failure forever.
      pdfJsPromise = null;
      throw new Error(
        `The PDF reader failed to load (${error instanceof Error ? error.message : String(error)}). Try again, or attach the text as .txt.`,
      );
    });
  }
  return pdfJsPromise;
}

/**
 * Extracts text page by page. The returned array index 0 is page 1, so a chunk
 * taken from `pages[i]` can cite page `i + 1` truthfully.
 */
async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  try {
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : " "))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        pages.push(text);
      } finally {
        page.cleanup();
      }
    }

    return pages;
  } finally {
    // Destroys the worker as well; PDFDocumentProxy has no public destroy().
    await loadingTask.destroy();
  }
}

/**
 * Reads an upload into indexable text, or throws an error whose message is
 * safe to show the user.
 */
export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  if (isPdfFile(file)) {
    const pages = await extractPdfPages(file);
    const text = pages.join("\n\n");

    const binaryReason = findBinaryContentReason(text);
    if (binaryReason) {
      throw new Error(`"${file.name}": ${binaryReason}.`);
    }
    if (text.trim().length < 10) {
      throw new Error(
        `"${file.name}" has no extractable text. Scanned PDFs need OCR — attach the text as .txt instead.`,
      );
    }

    return { name: file.name, text, pages };
  }

  if (!isPlainTextFile(file)) {
    throw new Error(unsupportedFileMessage(file.name));
  }

  const text = await readFileAsText(file);

  const binaryReason = findBinaryContentReason(text);
  if (binaryReason) {
    throw new Error(`"${file.name}": ${binaryReason}.`);
  }
  if (text.trim().length < 10) {
    throw new Error(`"${file.name}" has no readable text to index.`);
  }

  return { name: file.name, text };
}

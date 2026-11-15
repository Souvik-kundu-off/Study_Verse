/**
 * Guards the RAG ingestion boundary against binary payloads.
 *
 * Uploaded files are read with `FileReader.readAsText`, which does not fail on
 * a PDF or DOCX — it decodes the bytes into mojibake. That string then gets
 * chunked and embedded, quietly filling `document_chunks` with unreadable rows.
 * These helpers let the client refuse the file and let the server refuse the
 * payload, so bad content never reaches the vector store.
 */

/**
 * Signatures that survive `readAsText` unchanged. Binary formats with
 * non-UTF-8 leading bytes (PNG, JPEG) decode to U+FFFD instead and are caught
 * by the unreadable-ratio check below.
 */
const BINARY_SIGNATURES: ReadonlyArray<{ label: string; prefix: string }> = [
  { label: "a PDF document", prefix: "%PDF" },
  { label: "a ZIP-based document (DOCX, PPTX or XLSX)", prefix: "PK\u0003\u0004" },
  { label: "a ZIP-based document (DOCX, PPTX or XLSX)", prefix: "PK\u0005\u0006" },
  { label: "a GIF image", prefix: "GIF87a" },
  { label: "a GIF image", prefix: "GIF89a" },
];

const SAMPLE_LENGTH = 4000;
const MAX_UNREADABLE_RATIO = 0.02;

const PLAIN_TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];
const PLAIN_TEXT_MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];

function countUnreadable(sample: string): number {
  let count = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
    // Control characters, DEL, and the replacement char left by a failed decode.
    if (code < 0x20 || code === 0x7f || code === 0xfffd) count++;
  }
  return count;
}

/**
 * Returns a reason sentence when `text` is not readable plain text, or `null`
 * when it is safe to chunk and embed.
 */
export function findBinaryContentReason(text: string): string | null {
  const sample = text.slice(0, SAMPLE_LENGTH);

  for (const { label, prefix } of BINARY_SIGNATURES) {
    if (sample.startsWith(prefix)) {
      return `this looks like ${label} rather than plain text`;
    }
  }

  if (sample.length === 0) return null;

  const unreadable = countUnreadable(sample);
  const ratio = unreadable / sample.length;
  if (ratio > MAX_UNREADABLE_RATIO) {
    return `${Math.round(ratio * 100)}% of the leading characters are unreadable binary data`;
  }

  return null;
}

/** True when the file is a text format we can index verbatim. */
export function isPlainTextFile(file: { name: string; type: string }): boolean {
  const name = file.name.toLowerCase();
  if (PLAIN_TEXT_EXTENSIONS.some((extension) => name.endsWith(extension))) return true;
  return PLAIN_TEXT_MIME_TYPES.includes(file.type.toLowerCase());
}

/** Consistent refusal copy for a file we cannot index. */
export function unsupportedFileMessage(name: string): string {
  return `"${name}" can't be indexed. Attach plain-text notes (.txt or .md) — PDFs and Word documents must be converted to text first.`;
}

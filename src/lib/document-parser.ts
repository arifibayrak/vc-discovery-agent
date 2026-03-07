export interface ParsedDocument {
  text: string | null;
  images: Array<{ data: string; mediaType: "image/png" | "image/jpeg" }>;
  pageCount: number | null;
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedDocument> {
  // PDF
  if (mimeType === "application/pdf") {
    return parsePdf(buffer);
  }

  // PowerPoint / Office
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return parseOffice(buffer);
  }

  // Images — encode as base64 for Claude vision
  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    const base64 = buffer.toString("base64");
    return {
      text: null,
      images: [
        {
          data: base64,
          mediaType: mimeType as "image/png" | "image/jpeg",
        },
      ],
      pageCount: 1,
    };
  }

  // Plain text — pass through directly (e.g. .txt pitch deck notes)
  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = buffer.toString("utf-8");
    return { text: text || null, images: [], pageCount: null };
  }

  // Unsupported format
  return { text: null, images: [], pageCount: null };
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // pdf-parse is a CJS module; use require to avoid ESM interop issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buffer: Buffer,
      options?: Record<string, unknown>
    ) => Promise<{ text: string; numpages: number }>;

    const data = await pdfParse(buffer);
    return {
      text: data.text || null,
      images: [],
      pageCount: data.numpages ?? null,
    };
  } catch (err) {
    console.error("[document-parser] PDF parsing failed:", err);
    return { text: null, images: [], pageCount: null };
  }
}

async function parseOffice(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // officeparser is a CJS module; use require for reliable interop
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseOffice: parse } = require("officeparser") as {
      parseOffice: (
        file: Buffer | string,
        config?: Record<string, unknown>
      ) => Promise<string>;
    };

    const text = await parse(buffer);
    return {
      text: text || null,
      images: [],
      pageCount: null,
    };
  } catch (err) {
    console.error("[document-parser] Office parsing failed:", err);
    return { text: null, images: [], pageCount: null };
  }
}

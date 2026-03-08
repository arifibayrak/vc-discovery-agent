import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSubmission } from "@/dal/submissions";
import { uploadFileToStorage, createFileRecord } from "@/dal/uploads";
import { isAllowedMimeType, FileType } from "@/schemas/upload";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpg",
};

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * Detect the real MIME type from file magic bytes, with Content-Disposition
 * filename as a tiebreaker for ZIP-based formats (PPTX vs XLSX).
 */
function sniffMimeType(buffer: Buffer, contentDisposition: string | null): string | null {
  if (buffer.length >= 4) {
    // PDF: starts with %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return "application/pdf";
    }

    // ZIP-based Office formats (PPTX, XLSX, DOCX): PK\x03\x04
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      // Try to determine specific format from Content-Disposition filename
      const ext = extractExtFromDisposition(contentDisposition);
      if (ext && EXT_TO_MIME[ext] && isAllowedMimeType(EXT_TO_MIME[ext])) {
        return EXT_TO_MIME[ext];
      }
      // Default to PPTX (most likely for pitch deck uploads)
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }

    // PNG: \x89PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return "image/png";
    }

    // JPEG: \xFF\xD8
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return "image/jpeg";
    }
  }

  // Fall back to Content-Disposition filename extension
  const ext = extractExtFromDisposition(contentDisposition);
  if (ext && EXT_TO_MIME[ext] && isAllowedMimeType(EXT_TO_MIME[ext])) {
    return EXT_TO_MIME[ext];
  }

  return null;
}

function extractExtFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
  if (!match) return null;
  const filename = decodeURIComponent(match[1].trim());
  return filename.split(".").pop()?.toLowerCase() ?? null;
}

function extractDriveFileId(raw: string): string | null {
  const m = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return m[1];
  const m2 = raw.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (m2) return m2[1];
  const m3 = raw.match(/[?&]id=([^&]+)/);
  if (m3 && raw.includes("drive.google.com")) return m3[1];
  return null;
}

function normaliseUrl(raw: string): string {
  const driveId = extractDriveFileId(raw);
  if (driveId) {
    return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t&authuser=0`;
  }
  if (raw.includes("dropbox.com")) return raw.replace("?dl=0", "?dl=1").replace("&dl=0", "&dl=1");
  return raw;
}

async function retryGoogleDriveFromHtml(html: string, fileId: string): Promise<Response | null> {
  const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
  const uuidMatch = html.match(/uuid=([0-9A-Za-z_-]+)/);
  if (!confirmMatch) return null;

  const confirm = confirmMatch[1];
  const uuid = uuidMatch ? `&uuid=${uuidMatch[1]}` : "";
  const retryUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirm}${uuid}&authuser=0`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    return await fetch(retryUrl, { signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

function deriveFileName(url: string, contentDisposition: string | null, mimeType: string): string {
  if (contentDisposition) {
    const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
    if (match) return decodeURIComponent(match[1].trim());
  }
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").pop();
    if (name && name.includes(".")) return decodeURIComponent(name);
  } catch {}
  return `pitch-deck.${MIME_TO_EXT[mimeType] ?? "pdf"}`;
}

/** Upload a buffer and return the created file record */
async function saveBuffer(
  id: string, fileType: string, rawUrl: string,
  buffer: Buffer, mimeType: string, contentDisposition: string | null
) {
  const ext = MIME_TO_EXT[mimeType] ?? "pdf";
  const storagePath = `${id}/${uuidv4()}.${ext}`;
  const fileName = deriveFileName(rawUrl, contentDisposition, mimeType);
  await uploadFileToStorage(storagePath, buffer, mimeType);
  return createFileRecord({
    submission_id: id, file_type: fileType, file_name: fileName,
    mime_type: mimeType, size_bytes: buffer.byteLength, storage_path: storagePath,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getSubmission(id); // 404 if not found

    const body = await req.json();
    const rawUrl: string = body.url ?? "";
    const fileType = FileType.safeParse(body.file_type ?? "pitch_deck").success
      ? (body.file_type ?? "pitch_deck")
      : "pitch_deck";

    if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid URL — must start with http:// or https://" }, { status: 400 });
    }

    const isGoogleDrive = rawUrl.includes("drive.google.com");
    const driveFileId = isGoogleDrive ? extractDriveFileId(rawUrl) : null;
    const fetchUrl = normaliseUrl(rawUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(fetchUrl, { signal: controller.signal, redirect: "follow" });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const hint = isGoogleDrive
        ? " Make sure the file is shared as 'Anyone with the link can view'."
        : "";
      return NextResponse.json({ error: `Could not access the URL (HTTP ${response.status}).${hint}` }, { status: 400 });
    }

    let contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

    // ── Case 1: Google Drive HTML confirmation page ──────────────────────────
    if (contentType === "text/html" && isGoogleDrive && driveFileId) {
      const html = await response.text();
      const retried = await retryGoogleDriveFromHtml(html, driveFileId);
      if (retried && retried.ok) {
        let retriedType = (retried.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        const arrayBuffer = await retried.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.byteLength > MAX_SIZE) {
          return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
        }

        // Sniff if generic
        if (!isAllowedMimeType(retriedType)) {
          const sniffed = sniffMimeType(buffer, retried.headers.get("content-disposition"));
          if (sniffed) retriedType = sniffed;
        }

        if (isAllowedMimeType(retriedType)) {
          const record = await saveBuffer(id, fileType, rawUrl, buffer, retriedType, retried.headers.get("content-disposition"));
          return NextResponse.json(record, { status: 201 });
        }
      }
      return NextResponse.json({
        error: "Could not download from Google Drive. Please check:\n1. The file is shared as 'Anyone with the link can view'\n2. The link points directly to a PDF or PPTX file\n\nAlternatively, download the file and upload it directly.",
      }, { status: 400 });
    }

    // ── Case 2: Generic octet-stream — download and sniff ───────────────────
    if (contentType === "application/octet-stream" || !contentType) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.byteLength > MAX_SIZE) {
        return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
      }
      const sniffed = sniffMimeType(buffer, response.headers.get("content-disposition"));
      if (!sniffed || !isAllowedMimeType(sniffed)) {
        return NextResponse.json({
          error: `Could not determine the file type from this link. Please make sure it points directly to a PDF or PPTX file.${isGoogleDrive ? "\n\nFor Google Drive: ensure the file is shared as 'Anyone with the link can view'." : ""}`,
        }, { status: 400 });
      }
      const record = await saveBuffer(id, fileType, rawUrl, buffer, sniffed, response.headers.get("content-disposition"));
      return NextResponse.json(record, { status: 201 });
    }

    // ── Case 3: Known but unsupported MIME type ──────────────────────────────
    if (!isAllowedMimeType(contentType)) {
      const hint = isGoogleDrive
        ? "\n\nFor Google Drive: make sure the file is set to 'Anyone with the link can view' and the link points to a PDF or PPTX."
        : "";
      return NextResponse.json(
        { error: `Unsupported file type received (${contentType || "unknown"}). Supported formats: PDF, PPTX, PNG, JPEG.${hint}` },
        { status: 400 }
      );
    }

    // ── Case 4: Normal flow — known allowed MIME type ────────────────────────
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
    }

    const record = await saveBuffer(id, fileType, rawUrl, buffer, contentType, response.headers.get("content-disposition"));
    return NextResponse.json(record, { status: 201 });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("abort")) {
      return NextResponse.json({ error: "Request timed out. The URL may be too slow or unavailable." }, { status: 408 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

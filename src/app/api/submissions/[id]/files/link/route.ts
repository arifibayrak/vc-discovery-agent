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

function normaliseUrl(raw: string): string {
  // Google Drive: /file/d/ID/view  →  direct download
  const driveFile = raw.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveFile) return `https://drive.google.com/uc?export=download&id=${driveFile[1]}&confirm=t`;

  // Google Drive: open?id=ID
  const driveOpen = raw.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}&confirm=t`;

  // Dropbox: ?dl=0  →  ?dl=1
  if (raw.includes("dropbox.com")) return raw.replace("?dl=0", "?dl=1").replace("&dl=0", "&dl=1");

  return raw;
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
      return NextResponse.json({ error: `Failed to fetch URL: HTTP ${response.status}` }, { status: 400 });
    }

    // Determine MIME type
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!isAllowedMimeType(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType || "unknown"}. Supported: PDF, PPTX, PNG, JPEG.` },
        { status: 400 }
      );
    }

    // Check size
    const contentLength = parseInt(response.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
    }

    const ext = MIME_TO_EXT[contentType] ?? "pdf";
    const storagePath = `${id}/${uuidv4()}.${ext}`;
    const fileName = deriveFileName(rawUrl, response.headers.get("content-disposition"), contentType);

    await uploadFileToStorage(storagePath, buffer, contentType);

    const record = await createFileRecord({
      submission_id: id,
      file_type: fileType,
      file_name: fileName,
      mime_type: contentType,
      size_bytes: buffer.byteLength,
      storage_path: storagePath,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("abort")) {
      return NextResponse.json({ error: "Request timed out fetching the URL." }, { status: 408 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

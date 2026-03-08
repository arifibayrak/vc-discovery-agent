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
    // Use the newer usercontent endpoint — more reliable than /uc
    return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t&authuser=0`;
  }

  // Dropbox: ?dl=0  →  ?dl=1
  if (raw.includes("dropbox.com")) return raw.replace("?dl=0", "?dl=1").replace("&dl=0", "&dl=1");

  return raw;
}

async function retryGoogleDriveFromHtml(html: string, fileId: string): Promise<Response | null> {
  // Google's confirmation page embeds a confirm token in the download link
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

    // Google Drive returns an HTML confirmation page for large files — retry with extracted confirm token
    if (contentType === "text/html" && isGoogleDrive && driveFileId) {
      const html = await response.text();
      const retried = await retryGoogleDriveFromHtml(html, driveFileId);
      if (retried && retried.ok) {
        const retriedType = (retried.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (isAllowedMimeType(retriedType)) {
          // Use the retried response
          const arrayBuffer = await retried.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.byteLength > MAX_SIZE) {
            return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 400 });
          }
          const ext = MIME_TO_EXT[retriedType] ?? "pdf";
          const storagePath = `${id}/${uuidv4()}.${ext}`;
          const fileName = deriveFileName(rawUrl, retried.headers.get("content-disposition"), retriedType);
          await uploadFileToStorage(storagePath, buffer, retriedType);
          const record = await createFileRecord({
            submission_id: id, file_type: fileType, file_name: fileName,
            mime_type: retriedType, size_bytes: buffer.byteLength, storage_path: storagePath,
          });
          return NextResponse.json(record, { status: 201 });
        }
      }
      // Could not extract file from Drive
      return NextResponse.json({
        error: "Could not download from Google Drive. Please check:\n1. The file is shared as 'Anyone with the link can view'\n2. The link points directly to a PDF or PPTX file\n\nAlternatively, download the file and upload it directly.",
      }, { status: 400 });
    }

    if (!isAllowedMimeType(contentType)) {
      const hint = isGoogleDrive
        ? "\n\nFor Google Drive: make sure the file is set to 'Anyone with the link can view' and the link points to a PDF or PPTX."
        : "";
      return NextResponse.json(
        { error: `Unsupported file type received (${contentType || "unknown"}). Supported formats: PDF, PPTX, PNG, JPEG.${hint}` },
        { status: 400 }
      );
    }

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
      submission_id: id, file_type: fileType, file_name: fileName,
      mime_type: contentType, size_bytes: buffer.byteLength, storage_path: storagePath,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.includes("abort")) {
      return NextResponse.json({ error: "Request timed out. The URL may be too slow or unavailable." }, { status: 408 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

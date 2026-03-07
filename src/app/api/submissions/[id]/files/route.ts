import { NextRequest } from "next/server";
import { errorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { UploadMetadataSchema, isAllowedMimeType } from "@/schemas/upload";
import { getSubmission } from "@/dal/submissions";
import { createFileRecord, getFilesBySubmission, uploadFileToStorage } from "@/dal/uploads";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    if (submission.status !== "draft" && submission.status !== "submitted") {
      throw new ConflictError(
        `Cannot upload files when submission is in '${submission.status}' state`
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("file_type") as string) || "other";

    if (!file) {
      throw new ValidationError("No file provided");
    }

    // Validate metadata
    const metadata = UploadMetadataSchema.safeParse({
      submission_id: id,
      file_type: fileType,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

    if (!metadata.success) {
      throw new ValidationError("Invalid file metadata", {
        fields: metadata.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    }

    if (!isAllowedMimeType(file.type)) {
      throw new ValidationError(
        `File type '${file.type}' is not allowed. Accepted types: PDF, PPTX, XLSX, XLS, PPT, CSV, PNG, JPEG.`
      );
    }

    // Upload to storage
    const fileExt = file.name.split(".").pop() || "bin";
    const storagePath = `${id}/${uuidv4()}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFileToStorage(storagePath, buffer, file.type);

    // Create metadata record
    const record = await createFileRecord({
      submission_id: id,
      file_type: metadata.data.file_type,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
    });

    return Response.json(record, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getSubmission(id); // throws if not found
    const files = await getFilesBySubmission(id);
    return Response.json(files);
  } catch (error) {
    return errorResponse(error);
  }
}

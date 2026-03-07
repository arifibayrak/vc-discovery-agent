import { createServiceClient } from "@/lib/supabase";
import { NotFoundError } from "@/lib/errors";
import type { UploadedFile } from "@/schemas/upload";

const BUCKET_NAME = "submission-files";

export async function createFileRecord(input: {
  submission_id: string;
  file_type: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}): Promise<UploadedFile> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("uploaded_files")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as UploadedFile;
}

export async function getFilesBySubmission(submissionId: string): Promise<UploadedFile[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("uploaded_files")
    .select()
    .eq("submission_id", submissionId)
    .order("uploaded_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UploadedFile[];
}

export async function getFile(id: string): Promise<UploadedFile> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("uploaded_files")
    .select()
    .eq("id", id)
    .single();

  if (error || !data) throw new NotFoundError("UploadedFile", id);
  return data as UploadedFile;
}

export async function deleteFile(id: string): Promise<void> {
  const file = await getFile(id);
  const db = createServiceClient();

  // Remove from storage
  const { error: storageError } = await db.storage
    .from(BUCKET_NAME)
    .remove([file.storage_path]);
  if (storageError) throw storageError;

  // Remove metadata record
  const { error } = await db.from("uploaded_files").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadFileToStorage(
  storagePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const db = createServiceClient();
  const { error } = await db.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
  return storagePath;
}

export async function downloadFile(storagePath: string): Promise<Buffer> {
  const db = createServiceClient();
  const { data, error } = await db.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error) throw error;
  if (!data) throw new Error(`No data returned for storage path: ${storagePath}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const db = createServiceClient();
  const { data, error } = await db.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

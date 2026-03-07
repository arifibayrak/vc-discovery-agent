import { z } from "zod";

export const FileType = z.enum(["pitch_deck", "financial_model", "cap_table", "other"]);
export type FileType = z.infer<typeof FileType>;

export const UploadMetadataSchema = z.object({
  submission_id: z.string().uuid(),
  file_type: FileType.default("other"),
  file_name: z.string().min(1).max(500),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().positive().max(50 * 1024 * 1024), // 50MB max
});
export type UploadMetadataInput = z.infer<typeof UploadMetadataSchema>;

export const UploadedFileSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  file_type: FileType,
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number(),
  storage_path: z.string(),
  uploaded_at: z.string(),
});
export type UploadedFile = z.infer<typeof UploadedFileSchema>;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
];

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

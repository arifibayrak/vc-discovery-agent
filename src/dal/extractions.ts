import { createServiceClient } from "@/lib/supabase";
import { NotFoundError } from "@/lib/errors";
import type { ExtractedData, ExtractedFields } from "@/schemas/extraction";

export async function createExtraction(input: {
  submission_id: string;
  file_id?: string | null;
}): Promise<ExtractedData> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("extracted_data")
    .insert({
      submission_id: input.submission_id,
      file_id: input.file_id ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExtractedData;
}

export async function updateExtraction(
  id: string,
  update: Partial<ExtractedFields> & {
    status?: string;
    raw_extraction?: unknown;
    error_message?: string | null;
    extracted_at?: string;
  }
): Promise<ExtractedData> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("extracted_data")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError("ExtractedData", id);
  return data as ExtractedData;
}

export async function getExtractionBySubmission(submissionId: string): Promise<ExtractedData | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("extracted_data")
    .select()
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ExtractedData | null;
}

export async function getExtraction(id: string): Promise<ExtractedData> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("extracted_data")
    .select()
    .eq("id", id)
    .single();

  if (error || !data) throw new NotFoundError("ExtractedData", id);
  return data as ExtractedData;
}

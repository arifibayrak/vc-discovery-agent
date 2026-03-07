import { NextRequest } from "next/server";
import { errorResponse, ConflictError, AppError } from "@/lib/errors";
import { getSubmission, updateSubmissionStatus } from "@/dal/submissions";
import { getFilesBySubmission, downloadFile } from "@/dal/uploads";
import { createExtraction, updateExtraction } from "@/dal/extractions";
import { getExtractionService } from "@/services/extraction";
import { validateWebsite } from "@/services/website-validator";
import type { ExtractedFields } from "@/schemas/extraction";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    if (submission.status !== "submitted" && submission.status !== "draft") {
      throw new ConflictError(
        `Cannot extract when submission is in '${submission.status}' state. Must be 'draft' or 'submitted'.`
      );
    }

    const files = await getFilesBySubmission(id);
    if (files.length === 0) {
      throw new AppError("No files uploaded for this submission", 400);
    }

    // Transition status
    await updateSubmissionStatus(id, "extracting");

    // Create extraction record
    const extraction = await createExtraction({
      submission_id: id,
      file_id: files[0].id,
    });

    try {
      // Mark as processing
      await updateExtraction(extraction.id, { status: "processing" });

      const service = getExtractionService();

      // Extract from each file and merge results
      const mergedFields: ExtractedFields = {};
      const rawResults: Record<string, unknown> = {};

      for (const file of files) {
        // Download the actual file bytes from Supabase Storage
        const fileBuffer = await downloadFile(file.storage_path);
        const result = await service.extract(fileBuffer, file.mime_type, file.file_name);
        rawResults[file.file_name] = result;

        // Merge: later files don't overwrite non-null values from earlier files
        for (const [key, value] of Object.entries(result)) {
          const k = key as keyof ExtractedFields;
          if (value != null && (mergedFields[k] == null || mergedFields[k] === "")) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mergedFields as any)[k] = value;
          }
        }
      }

      // Validate the company website if extracted
      let websiteValidation = null;
      if (mergedFields.website_url) {
        try {
          websiteValidation = await validateWebsite(mergedFields.website_url);
        } catch (err) {
          websiteValidation = {
            url: mergedFields.website_url,
            is_reachable: false,
            status_code: null,
            final_url: null,
            title: null,
            error: err instanceof Error ? err.message : "Website validation failed",
          };
        }
      }

      // Save extracted data
      const updated = await updateExtraction(extraction.id, {
        ...mergedFields,
        status: "completed",
        raw_extraction: {
          per_file: rawResults,
          website_validation: websiteValidation,
        },
        extracted_at: new Date().toISOString(),
      });

      await updateSubmissionStatus(id, "extracted");

      return Response.json(updated);
    } catch (extractionError) {
      // Mark extraction as failed
      await updateExtraction(extraction.id, {
        status: "failed",
        error_message: extractionError instanceof Error
          ? extractionError.message
          : "Unknown extraction error",
      });
      await updateSubmissionStatus(id, "failed");
      throw extractionError;
    }
  } catch (error) {
    return errorResponse(error);
  }
}

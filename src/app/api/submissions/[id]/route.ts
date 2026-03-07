import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getSubmission, deleteSubmission } from "@/dal/submissions";
import { getFilesBySubmission } from "@/dal/uploads";
import { getExtractionBySubmission } from "@/dal/extractions";
import { getValidationResults } from "@/dal/validations";
import { getFollowUpsBySubmission } from "@/dal/follow-ups";
import { getSummaryBySubmission } from "@/dal/summaries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    // Fetch all related data in parallel
    const [files, extraction, validations, followUps, summary] = await Promise.all([
      getFilesBySubmission(id),
      getExtractionBySubmission(id),
      getValidationResults(id),
      getFollowUpsBySubmission(id),
      getSummaryBySubmission(id),
    ]);

    return Response.json({
      ...submission,
      files,
      extraction,
      validations,
      follow_up_questions: followUps,
      summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getSubmission(id); // throws if not found
    await deleteSubmission(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

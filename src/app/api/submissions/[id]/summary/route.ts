import { NextRequest } from "next/server";
import { errorResponse, ConflictError, AppError } from "@/lib/errors";
import { getSubmission, updateSubmissionStatus } from "@/dal/submissions";
import { getExtractionBySubmission } from "@/dal/extractions";
import { getValidationResults } from "@/dal/validations";
import { getFollowUpsBySubmission } from "@/dal/follow-ups";
import { saveSummary, getSummaryBySubmission } from "@/dal/summaries";
import { getSummaryService } from "@/services/summary";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    const allowedStates = ["validated", "follow_up_received"];
    if (!allowedStates.includes(submission.status)) {
      throw new ConflictError(
        `Cannot generate summary when submission is in '${submission.status}' state. Must be 'validated' or 'follow_up_received'.`
      );
    }

    const extraction = await getExtractionBySubmission(id);
    if (!extraction || extraction.status !== "completed") {
      throw new AppError("No completed extraction found", 400);
    }

    await updateSubmissionStatus(id, "summarizing");

    const [validationResults, followUps] = await Promise.all([
      getValidationResults(id),
      getFollowUpsBySubmission(id),
    ]);

    const service = getSummaryService();
    const generated = service.generate(
      extraction,
      validationResults.map((r) => ({
        field_name: r.field_name,
        rule_name: r.rule_name,
        passed: r.passed,
        message: r.message,
        severity: r.severity as "error" | "warning" | "info",
      })),
      followUps
    );

    const summary = await saveSummary({
      submission_id: id,
      executive_summary: generated.executive_summary,
      strengths: generated.strengths,
      risks: generated.risks,
      key_metrics: generated.key_metrics,
      recommendation: generated.recommendation,
      score: generated.score,
    });

    await updateSubmissionStatus(id, "completed");

    return Response.json(summary, { status: 201 });
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
    await getSubmission(id);
    const summary = await getSummaryBySubmission(id);

    if (!summary) {
      return Response.json(
        { error: "No summary generated yet", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return Response.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { errorResponse, ConflictError, AppError } from "@/lib/errors";
import { getSubmission, updateSubmissionStatus } from "@/dal/submissions";
import { getExtractionBySubmission } from "@/dal/extractions";
import { saveValidationResults } from "@/dal/validations";
import { createFollowUpQuestions } from "@/dal/follow-ups";
import { getValidationService } from "@/services/validation";
import { getFollowUpService } from "@/services/follow-up";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    if (submission.status !== "extracted") {
      throw new ConflictError(
        `Cannot validate when submission is in '${submission.status}' state. Must be 'extracted'.`
      );
    }

    const extraction = await getExtractionBySubmission(id);
    if (!extraction || extraction.status !== "completed") {
      throw new AppError("No completed extraction found for this submission", 400);
    }

    // Transition status
    await updateSubmissionStatus(id, "validating");

    // Run validation
    const validationService = getValidationService();
    const ruleResults = validationService.validate(extraction);

    // Save results
    const savedResults = await saveValidationResults(id, extraction.id, ruleResults);

    // Generate follow-up questions
    const followUpService = getFollowUpService();
    const questions = followUpService.generate(extraction, ruleResults);

    let savedQuestions: Awaited<ReturnType<typeof createFollowUpQuestions>>;
    if (questions.length > 0) {
      savedQuestions = await createFollowUpQuestions(
        questions.map((q) => ({
          submission_id: id,
          question: q.question,
          context: q.context,
          field_name: q.field_name,
        }))
      );
      await updateSubmissionStatus(id, "follow_up_pending");
    } else {
      savedQuestions = [];
      await updateSubmissionStatus(id, "validated");
    }

    return Response.json({
      validation_results: savedResults,
      follow_up_questions: savedQuestions,
      has_follow_ups: questions.length > 0,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

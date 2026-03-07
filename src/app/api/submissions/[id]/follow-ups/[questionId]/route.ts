import { NextRequest } from "next/server";
import { errorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { AnswerFollowUpSchema } from "@/schemas/follow-up";
import { getSubmission, updateSubmissionStatus } from "@/dal/submissions";
import { answerFollowUp, getPendingQuestionCount } from "@/dal/follow-ups";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id, questionId } = await params;
    const submission = await getSubmission(id);

    if (submission.status !== "follow_up_pending") {
      throw new ConflictError(
        `Cannot answer follow-ups when submission is in '${submission.status}' state`
      );
    }

    const body = await request.json();
    const parsed = AnswerFollowUpSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid answer data");
    }

    const answered = await answerFollowUp(questionId, parsed.data.answer);

    // Check if all questions are answered
    const pendingCount = await getPendingQuestionCount(id);
    if (pendingCount === 0) {
      await updateSubmissionStatus(id, "follow_up_received");
    }

    return Response.json({
      question: answered,
      remaining_questions: pendingCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { errorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { BatchAnswerSchema } from "@/schemas/follow-up";
import { getSubmission, updateSubmissionStatus } from "@/dal/submissions";
import { answerFollowUp, getPendingQuestionCount } from "@/dal/follow-ups";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await getSubmission(id);

    if (submission.status !== "follow_up_pending") {
      throw new ConflictError(
        `Cannot answer follow-ups when submission is in '${submission.status}' state`
      );
    }

    const body = await request.json();
    const parsed = BatchAnswerSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid batch answer data");
    }

    const results = await Promise.all(
      parsed.data.answers.map((a) => answerFollowUp(a.question_id, a.answer))
    );

    const pendingCount = await getPendingQuestionCount(id);
    if (pendingCount === 0) {
      await updateSubmissionStatus(id, "follow_up_received");
    }

    return Response.json({
      answered: results,
      remaining_questions: pendingCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

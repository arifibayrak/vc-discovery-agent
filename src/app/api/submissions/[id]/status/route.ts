import { NextRequest } from "next/server";
import { errorResponse, ValidationError } from "@/lib/errors";
import { UpdateSubmissionStatusSchema } from "@/schemas/submission";
import { updateSubmissionStatus } from "@/dal/submissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSubmissionStatusSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid status");
    }

    const submission = await updateSubmissionStatus(id, parsed.data.status);
    return Response.json(submission);
  } catch (error) {
    return errorResponse(error);
  }
}

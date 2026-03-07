import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/errors";
import { getSubmission } from "@/dal/submissions";
import { getFollowUpsBySubmission } from "@/dal/follow-ups";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getSubmission(id); // throws if not found
    const questions = await getFollowUpsBySubmission(id);
    return Response.json(questions);
  } catch (error) {
    return errorResponse(error);
  }
}

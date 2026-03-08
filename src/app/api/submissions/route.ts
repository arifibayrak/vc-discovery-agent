import { NextRequest } from "next/server";
import { errorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { CreateSubmissionSchema, SubmissionListQuerySchema } from "@/schemas/submission";
import { createSubmission, listSubmissions, getSubmissionByEmail } from "@/dal/submissions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid submission data", {
        fields: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    }

    // Check for duplicate email
    const existing = await getSubmissionByEmail(parsed.data.contact_email);
    if (existing) {
      throw new ConflictError(
        `This email has already been used to submit an application. Each email can only submit once.`
      );
    }

    const submission = await createSubmission(parsed.data);
    return Response.json(submission, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = SubmissionListQuerySchema.safeParse(params);

    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters");
    }

    const result = await listSubmissions(parsed.data);
    return Response.json({
      data: result.data,
      total: result.count,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

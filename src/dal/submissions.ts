import { createServiceClient } from "@/lib/supabase";
import { NotFoundError } from "@/lib/errors";
import type { CreateSubmissionInput, Submission, SubmissionStatus } from "@/schemas/submission";

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("submissions")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as Submission;
}

export async function getSubmissionByEmail(email: string): Promise<Submission | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("submissions")
    .select()
    .eq("contact_email", email.toLowerCase().trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Submission | null;
}

export async function getSubmission(id: string): Promise<Submission> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("submissions")
    .select()
    .eq("id", id)
    .single();

  if (error || !data) throw new NotFoundError("Submission", id);
  return data as Submission;
}

export async function listSubmissions(opts: {
  status?: SubmissionStatus;
  limit: number;
  offset: number;
}): Promise<{ data: Submission[]; count: number }> {
  const db = createServiceClient();
  let query = db.from("submissions").select("*", { count: "exact" });

  if (opts.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(opts.offset, opts.offset + opts.limit - 1);

  if (error) throw error;
  return { data: (data ?? []) as Submission[], count: count ?? 0 };
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus
): Promise<Submission> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("submissions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError("Submission", id);
  return data as Submission;
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("submissions").delete().eq("id", id);
  if (error) throw error;
}

import { createServiceClient } from "@/lib/supabase";
import { NotFoundError } from "@/lib/errors";
import type { FollowUpQuestion } from "@/schemas/follow-up";

export async function createFollowUpQuestions(
  questions: {
    submission_id: string;
    question: string;
    context?: string | null;
    field_name?: string | null;
  }[]
): Promise<FollowUpQuestion[]> {
  if (questions.length === 0) return [];

  const db = createServiceClient();
  const { data, error } = await db
    .from("follow_up_questions")
    .insert(questions)
    .select();

  if (error) throw error;
  return (data ?? []) as FollowUpQuestion[];
}

export async function getFollowUpsBySubmission(
  submissionId: string
): Promise<FollowUpQuestion[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("follow_up_questions")
    .select()
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as FollowUpQuestion[];
}

export async function answerFollowUp(
  id: string,
  answer: string
): Promise<FollowUpQuestion> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("follow_up_questions")
    .update({
      answer,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError("FollowUpQuestion", id);
  return data as FollowUpQuestion;
}

export async function skipFollowUp(id: string): Promise<FollowUpQuestion> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("follow_up_questions")
    .update({ status: "skipped" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new NotFoundError("FollowUpQuestion", id);
  return data as FollowUpQuestion;
}

export async function getPendingQuestionCount(submissionId: string): Promise<number> {
  const db = createServiceClient();
  const { count, error } = await db
    .from("follow_up_questions")
    .select("*", { count: "exact", head: true })
    .eq("submission_id", submissionId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

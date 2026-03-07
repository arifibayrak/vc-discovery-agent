import { createServiceClient } from "@/lib/supabase";
import type { InvestorSummary } from "@/schemas/summary";

export async function saveSummary(input: {
  submission_id: string;
  executive_summary: string;
  strengths: string[];
  risks: string[];
  key_metrics: Record<string, unknown>;
  recommendation?: string | null;
  score?: number | null;
}): Promise<InvestorSummary> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("investor_summaries")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as InvestorSummary;
}

export async function getSummaryBySubmission(
  submissionId: string
): Promise<InvestorSummary | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("investor_summaries")
    .select()
    .eq("submission_id", submissionId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as InvestorSummary | null;
}

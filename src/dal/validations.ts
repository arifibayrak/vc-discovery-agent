import { createServiceClient } from "@/lib/supabase";
import type { ValidationResult, ValidationRuleResult } from "@/schemas/validation";

export async function saveValidationResults(
  submissionId: string,
  extractedDataId: string,
  results: ValidationRuleResult[]
): Promise<ValidationResult[]> {
  const db = createServiceClient();

  // Delete previous results for this extraction
  await db
    .from("validation_results")
    .delete()
    .eq("extracted_data_id", extractedDataId);

  if (results.length === 0) return [];

  const rows = results.map((r) => ({
    submission_id: submissionId,
    extracted_data_id: extractedDataId,
    field_name: r.field_name,
    rule_name: r.rule_name,
    passed: r.passed,
    message: r.message,
    severity: r.severity,
  }));

  const { data, error } = await db
    .from("validation_results")
    .insert(rows)
    .select();

  if (error) throw error;
  return (data ?? []) as ValidationResult[];
}

export async function getValidationResults(
  submissionId: string
): Promise<ValidationResult[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("validation_results")
    .select()
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ValidationResult[];
}

import { z } from "zod";

export const ValidationSeverity = z.enum(["error", "warning", "info"]);
export type ValidationSeverity = z.infer<typeof ValidationSeverity>;

export const ValidationResultSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  extracted_data_id: z.string().uuid(),
  field_name: z.string(),
  rule_name: z.string(),
  passed: z.boolean(),
  message: z.string(),
  severity: ValidationSeverity,
  created_at: z.string(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const ValidationRuleResult = z.object({
  field_name: z.string(),
  rule_name: z.string(),
  passed: z.boolean(),
  message: z.string(),
  severity: ValidationSeverity,
});
export type ValidationRuleResult = z.infer<typeof ValidationRuleResult>;

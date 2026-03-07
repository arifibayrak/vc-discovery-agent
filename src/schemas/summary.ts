import { z } from "zod";

export const InvestorSummarySchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  executive_summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  key_metrics: z.record(z.string(), z.unknown()),
  recommendation: z.string().nullable(),
  score: z.number().int().min(0).max(100).nullable(),
  generated_at: z.string(),
});
export type InvestorSummary = z.infer<typeof InvestorSummarySchema>;

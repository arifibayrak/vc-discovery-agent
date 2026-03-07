import { z } from "zod";

export const ExtractionStatus = z.enum(["pending", "processing", "completed", "failed"]);
export type ExtractionStatus = z.infer<typeof ExtractionStatus>;

export const ExtractedFieldsSchema = z.object({
  industry: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  funding_ask_usd: z.number().int().nullable().optional(),
  revenue_annual_usd: z.number().int().nullable().optional(),
  burn_rate_monthly_usd: z.number().int().nullable().optional(),
  team_size: z.number().int().nullable().optional(),
  founded_year: z.number().int().nullable().optional(),
  location: z.string().nullable().optional(),
  problem_statement: z.string().nullable().optional(),
  solution_description: z.string().nullable().optional(),
  target_market: z.string().nullable().optional(),
  business_model: z.string().nullable().optional(),
  traction_summary: z.string().nullable().optional(),
  competitive_landscape: z.string().nullable().optional(),
  use_of_funds: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  is_pitch_deck: z.boolean().nullable().optional(),
  pitch_deck_confidence: z.number().min(0).max(1).nullable().optional(),
  sections_found: z.array(z.string()).nullable().optional(),
});
export type ExtractedFields = z.infer<typeof ExtractedFieldsSchema>;

export const ExtractedDataSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  file_id: z.string().uuid().nullable(),
  status: ExtractionStatus,
  ...ExtractedFieldsSchema.shape,
  raw_extraction: z.any().nullable(),
  error_message: z.string().nullable(),
  extracted_at: z.string().nullable(),
  created_at: z.string(),
});
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

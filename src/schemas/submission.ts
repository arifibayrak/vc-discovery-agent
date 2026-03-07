import { z } from "zod";

export const SubmissionStatus = z.enum([
  "draft",
  "submitted",
  "extracting",
  "extracted",
  "validating",
  "validated",
  "follow_up_pending",
  "follow_up_received",
  "summarizing",
  "completed",
  "failed",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatus>;

export const CreateSubmissionSchema = z.object({
  company_name: z.string().min(1).max(200),
  contact_email: z.string().email().max(320),
  contact_name: z.string().min(1).max(200),
});
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export const UpdateSubmissionStatusSchema = z.object({
  status: SubmissionStatus,
});

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  company_name: z.string(),
  contact_email: z.string().email(),
  contact_name: z.string(),
  status: SubmissionStatus,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const SubmissionListQuerySchema = z.object({
  status: SubmissionStatus.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SubmissionListQuery = z.infer<typeof SubmissionListQuerySchema>;

import { z } from "zod";

export const QuestionStatus = z.enum(["pending", "answered", "skipped"]);
export type QuestionStatus = z.infer<typeof QuestionStatus>;

export const FollowUpQuestionSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  question: z.string(),
  context: z.string().nullable(),
  field_name: z.string().nullable(),
  status: QuestionStatus,
  answer: z.string().nullable(),
  answered_at: z.string().nullable(),
  created_at: z.string(),
});
export type FollowUpQuestion = z.infer<typeof FollowUpQuestionSchema>;

export const AnswerFollowUpSchema = z.object({
  answer: z.string().min(1).max(5000),
});
export type AnswerFollowUpInput = z.infer<typeof AnswerFollowUpSchema>;

export const BatchAnswerSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer: z.string().min(1).max(5000),
    })
  ).min(1),
});
export type BatchAnswerInput = z.infer<typeof BatchAnswerSchema>;

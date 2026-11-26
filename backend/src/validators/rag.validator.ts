import { z } from "zod";

// Validate incoming user questions
export const ragQuerySchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Question must contain at least 5 characters")
    .max(1000, "Question must not exceed 1000 characters"),

  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),
});

// Validate AI-generated answers
export const ragResponseSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1)
    .max(20000),

  supportingEvidence: z
    .array(
      z.object({
        sourceId: z.string().min(1),

        evidence: z.string().min(1),
      })
    )
    .max(10),

  confidence: z.enum([
    "high",
    "medium",
    "low",
  ]),

  insufficientContext: z.boolean(),

  followUpQuestions: z
    .array(z.string().min(1))
    .max(5),
});

export type RAGQuery = z.infer<
  typeof ragQuerySchema
>;

export type RAGResponse = z.infer<
  typeof ragResponseSchema
>;
import { z } from "zod";

// Validate incoming job matching requests
export const jobMatchingRequestSchema = z.object({
  resumeId: z
    .string()
    .regex(
      /^[a-fA-F0-9]{24}$/,
      "Invalid resume ID"
    ),

  jobTitle: z
    .string()
    .trim()
    .min(2)
    .max(150),

  companyName: z
    .string()
    .trim()
    .max(150)
    .optional(),

  jobDescription: z
    .string()
    .trim()
    .min(
      50,
      "Job description must contain at least 50 characters"
    )
    .max(
      20000,
      "Job description must not exceed 20000 characters"
    ),

  consent: z.literal(true),
});

// Individual assessment schema
const assessmentSchema = z.object({
  score: z.number().int().min(0).max(100),

  explanation: z
    .string()
    .trim()
    .min(1),
});

// Validate AI-generated job matching response
export const jobMatchingResponseSchema = z.object({
  summary: z.string().trim().min(1),

  requiredSkills: z.array(z.string()).max(50),

  preferredSkills: z.array(z.string()).max(50),

  matchedSkills: z
    .array(
      z.object({
        skill: z.string().min(1),

        evidence: z.string().min(1),

        matchType: z.enum([
          "exact",
          "related",
        ]),
      })
    )
    .max(50),

  missingSkills: z
    .array(
      z.object({
        skill: z.string().min(1),

        importance: z.enum([
          "required",
          "preferred",
        ]),

        recommendation: z.string().min(1),
      })
    )
    .max(50),

  strengths: z.array(z.string()).max(20),

  gaps: z.array(z.string()).max(20),

  assessment: z.object({
    technicalSkills: assessmentSchema,

    experience: assessmentSchema,

    education: assessmentSchema,

    projectRelevance: assessmentSchema,
  }),

  recommendations: z
    .array(
      z.object({
        title: z.string().min(1),

        description: z.string().min(1),

        priority: z.enum([
          "high",
          "medium",
          "low",
        ]),
      })
    )
    .max(20),
});

export type JobMatchingRequest = z.infer<
  typeof jobMatchingRequestSchema
>;

export type JobMatchingResponse = z.infer<
  typeof jobMatchingResponseSchema
>;
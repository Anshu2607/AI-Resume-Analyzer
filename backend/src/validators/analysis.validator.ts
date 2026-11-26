import { z } from "zod";

const assessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
});

export const analysisSchema = z.object({

  professionalSummary: z.string().min(1),

  technicalSkills: z.array(z.string()),

  softSkills: z.array(z.string()),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  missingSections: z.array(z.string()),

  improvementSuggestions: z.array(
    z.object({
      section: z.string(),
      suggestion: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),

  recommendedRoles: z.array(
    z.object({
      role: z.string(),
      reason: z.string(),
    })
  ),

  assessment: z.object({
    technicalSkills: assessmentSchema,
    experience: assessmentSchema,
    projects: assessmentSchema,
    education: assessmentSchema,
    resumeStructure: assessmentSchema,
    achievements: assessmentSchema,
  }),

});

export type AnalysisResult = z.infer<
  typeof analysisSchema
>;
import { z } from "zod";

// =====================================
// SKILL GAP PRIORITY
// =====================================

export const skillGapPrioritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

// =====================================
// SKILL IMPORTANCE
// =====================================

export const skillImportanceSchema = z.enum([
  "required",
  "preferred",
]);

// =====================================
// SKILL GAP REQUEST
// =====================================

export const skillGapRequestSchema = z.object({

  jobMatchId: z
    .string()
    .regex(
      /^[a-fA-F0-9]{24}$/,
      "Invalid job matching report ID"
    ),

});

// =====================================
// INDIVIDUAL SKILL GAP
// =====================================

export const skillGapItemSchema = z.object({

  skill: z
    .string()
    .trim()
    .min(1),

  importance: skillImportanceSchema,

  priority: skillGapPrioritySchema,

  priorityScore: z
    .number()
    .int()
    .min(0)
    .max(100),

  evidenceStatus: z.literal(
    "not_evidenced"
  ),

  recommendation: z
    .string()
    .trim()
    .min(1),

});

// =====================================
// SKILL GAP STATISTICS
// =====================================

export const skillGapStatisticsSchema = z.object({

  totalRequiredSkills: z
    .number()
    .int()
    .nonnegative(),

  totalPreferredSkills: z
    .number()
    .int()
    .nonnegative(),

  totalMatchedSkills: z
    .number()
    .int()
    .nonnegative(),

  totalMissingSkills: z
    .number()
    .int()
    .nonnegative(),

  missingRequiredSkills: z
    .number()
    .int()
    .nonnegative(),

  missingPreferredSkills: z
    .number()
    .int()
    .nonnegative(),

  criticalGaps: z
    .number()
    .int()
    .nonnegative(),

  highPriorityGaps: z
    .number()
    .int()
    .nonnegative(),

  mediumPriorityGaps: z
    .number()
    .int()
    .nonnegative(),

  lowPriorityGaps: z
    .number()
    .int()
    .nonnegative(),

  requiredSkillCoverage: z
    .number()
    .min(0)
    .max(100)
    .nullable(),

  preferredSkillCoverage: z
    .number()
    .min(0)
    .max(100)
    .nullable(),

});

// =====================================
// COMPLETE SKILL GAP REPORT
// =====================================

export const skillGapReportSchema = z.object({

  jobMatchId: z.string(),

  resumeId: z.string(),

  jobTitle: z.string(),

  companyName: z.string(),

  overallCompatibility: z
    .number()
    .min(0)
    .max(100),

  statistics: skillGapStatisticsSchema,

  skillGaps: z.array(
    skillGapItemSchema
  ),

  analysisVersion: z.string(),

  generatedAt: z.string(),

});

// =====================================
// TYPESCRIPT TYPES
// =====================================

export type SkillGapPriority = z.infer<
  typeof skillGapPrioritySchema
>;

export type SkillImportance = z.infer<
  typeof skillImportanceSchema
>;

export type SkillGapRequest = z.infer<
  typeof skillGapRequestSchema
>;

export type SkillGapItem = z.infer<
  typeof skillGapItemSchema
>;

export type SkillGapStatistics = z.infer<
  typeof skillGapStatisticsSchema
>;

export type SkillGapReport = z.infer<
  typeof skillGapReportSchema
>;
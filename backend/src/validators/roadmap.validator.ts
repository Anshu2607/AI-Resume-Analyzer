import { z } from "zod";

// =====================================
// ROADMAP DIFFICULTY
// =====================================

export const roadmapDifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

// =====================================
// LEARNING ACTIVITY TYPES
// =====================================

export const activityTypeSchema = z.enum([
  "theory",
  "practice",
  "project",
  "assessment",
  "revision",
]);

// =====================================
// ROADMAP GENERATION REQUEST
// =====================================

export const roadmapRequestSchema = z.object({

  jobMatchId: z
    .string()
    .regex(
      /^[a-fA-F0-9]{24}$/,
      "Invalid job matching report ID"
    ),

  durationWeeks: z
    .number()
    .int()
    .min(1)
    .max(24)
    .default(8),

  hoursPerWeek: z
    .number()
    .int()
    .min(2)
    .max(40)
    .default(10),

  difficulty: roadmapDifficultySchema
    .default("intermediate"),

  consent: z.literal(true),

});

// =====================================
// LEARNING RESOURCE
// =====================================

export const learningResourceSchema = z.object({

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  type: z.enum([
    "documentation",
    "course",
    "tutorial",
    "book",
    "practice",
  ]),

  searchQuery: z
    .string()
    .trim()
    .min(1)
    .max(300),

  description: z
    .string()
    .trim()
    .min(1)
    .max(1000),

});

// =====================================
// INDIVIDUAL LEARNING ACTIVITY
// =====================================

export const learningActivitySchema = z.object({

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  description: z
    .string()
    .trim()
    .min(1)
    .max(2000),

  type: activityTypeSchema,

  estimatedHours: z
    .number()
    .min(0.5)
    .max(40),

  targetSkills: z
    .array(
      z.string().trim().min(1)
    )
    .min(1)
    .max(15),

  expectedOutcome: z
    .string()
    .trim()
    .min(1)
    .max(1000),

  resources: z
    .array(learningResourceSchema)
    .max(5),

});

// =====================================
// WEEKLY LEARNING MILESTONE
// =====================================

export const weeklyMilestoneSchema = z.object({

  week: z
    .number()
    .int()
    .min(1)
    .max(24),

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  objective: z
    .string()
    .trim()
    .min(1)
    .max(1500),

  targetSkills: z
    .array(
      z.string().trim().min(1)
    )
    .min(1)
    .max(20),

  activities: z
    .array(learningActivitySchema)
    .min(1)
    .max(8),

  completionCriteria: z
    .array(
      z.string().trim().min(1).max(500)
    )
    .min(1)
    .max(8),

});

// =====================================
// PRACTICAL PROJECT
// =====================================

export const roadmapProjectSchema = z.object({

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  description: z
    .string()
    .trim()
    .min(1)
    .max(2000),

  difficulty: roadmapDifficultySchema,

  targetSkills: z
    .array(
      z.string().trim().min(1)
    )
    .min(1)
    .max(20),

  deliverables: z
    .array(
      z.string().trim().min(1).max(500)
    )
    .min(1)
    .max(10),

  estimatedHours: z
    .number()
    .min(0.5)
    .max(200),

});

// =====================================
// DEFERRED SKILLS
// =====================================

export const deferredSkillSchema = z.object({

  skill: z
    .string()
    .trim()
    .min(1),

  reason: z
    .string()
    .trim()
    .min(1)
    .max(1000),

});

// =====================================
// COMPLETE AI ROADMAP RESPONSE
// =====================================

export const roadmapResponseSchema = z.object({

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  summary: z
    .string()
    .trim()
    .min(1)
    .max(3000),

  learningObjectives: z
    .array(
      z.string().trim().min(1).max(500)
    )
    .min(1)
    .max(20),

  coveredSkills: z
    .array(
      z.string().trim().min(1)
    )
    .min(1)
    .max(100),

  deferredSkills: z
    .array(deferredSkillSchema)
    .max(100),

  milestones: z
    .array(weeklyMilestoneSchema)
    .min(1)
    .max(24),

  practicalProjects: z
    .array(roadmapProjectSchema)
    .max(5),

  finalAssessment: z.object({

    description: z
      .string()
      .trim()
      .min(1)
      .max(2000),

    successCriteria: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .min(1)
      .max(15),

  }),

  recommendations: z
    .array(
      z.string().trim().min(1).max(1000)
    )
    .max(10),

});

// =====================================
// ROADMAP STATUS
// =====================================

export const roadmapStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "archived",
]);

// =====================================
// ACTIVITY PROGRESS UPDATE
// =====================================

export const activityProgressSchema = z.object({

  week: z
    .number()
    .int()
    .min(1)
    .max(24),

  activityIndex: z
    .number()
    .int()
    .min(0)
    .max(7),

  completed: z.boolean(),

});

// =====================================
// TYPESCRIPT TYPES
// =====================================

export type RoadmapDifficulty = z.infer<
  typeof roadmapDifficultySchema
>;

export type ActivityType = z.infer<
  typeof activityTypeSchema
>;

export type RoadmapRequest = z.infer<
  typeof roadmapRequestSchema
>;

export type LearningResource = z.infer<
  typeof learningResourceSchema
>;

export type LearningActivity = z.infer<
  typeof learningActivitySchema
>;

export type WeeklyMilestone = z.infer<
  typeof weeklyMilestoneSchema
>;

export type RoadmapProject = z.infer<
  typeof roadmapProjectSchema
>;

export type RoadmapResponse = z.infer<
  typeof roadmapResponseSchema
>;

export type RoadmapStatus = z.infer<
  typeof roadmapStatusSchema
>;

export type ActivityProgress = z.infer<
  typeof activityProgressSchema
>;
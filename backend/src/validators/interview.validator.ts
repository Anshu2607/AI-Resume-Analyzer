import { z } from "zod";

// MongoDB ID validation

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ID");

// Interview types

export const interviewTypeSchema = z.enum([
  "technical",
  "hr",
  "behavioral",
  "resume_based",
  "job_specific",
  "mixed",
]);

// Interview difficulty

export const interviewDifficultySchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

// Interview status

export const interviewStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
]);

// Question categories

export const questionCategorySchema = z.enum([
  "technical",
  "conceptual",
  "scenario_based",
  "problem_solving",
  "project_based",
  "resume_based",
  "behavioral",
  "hr",
  "system_design",
]);

// Answer status

export const interviewAnswerStatusSchema = z.enum([
  "answered",
  "skipped",
]);

// Create interview request

export const createInterviewSchema = z
  .object({
    interviewType: interviewTypeSchema,

    targetRole: z
      .string()
      .trim()
      .min(2)
      .max(150),

    companyName: z
      .string()
      .trim()
      .max(150)
      .optional(),

    resumeId: objectIdSchema.optional(),

    jobMatchId: objectIdSchema.optional(),

    difficulty:
      interviewDifficultySchema.default(
        "intermediate"
      ),

    questionCount: z
      .number()
      .int()
      .min(3)
      .max(15)
      .default(5),

    topics: z
      .array(
        z.string().trim().min(1).max(100)
      )
      .max(10)
      .default([]),

    adaptiveDifficulty: z
      .boolean()
      .default(true),

    enableFollowUps: z
      .boolean()
      .default(true),

    consent: z.literal(true),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.interviewType === "resume_based" &&
      !data.resumeId
    ) {
      context.addIssue({
        code: "custom",
        path: ["resumeId"],
        message:
          "Resume ID is required for a resume-based interview",
      });
    }

    if (
      data.interviewType === "job_specific" &&
      !data.jobMatchId
    ) {
      context.addIssue({
        code: "custom",
        path: ["jobMatchId"],
        message:
          "Job matching ID is required for a job-specific interview",
      });
    }
  });

// AI-generated question schema

export const generatedQuestionSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(5)
      .max(2000),

    category: questionCategorySchema,

    topic: z
      .string()
      .trim()
      .min(1)
      .max(150),

    expectedAnswer: z
      .string()
      .trim()
      .min(5)
      .max(5000),

    keyPoints: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .min(1)
      .max(10),
  })
  .strict();

// Persisted interview question

export const interviewQuestionSchema =
  generatedQuestionSchema.extend({
    questionId: z.string().uuid(),

    questionNumber: z
      .number()
      .int()
      .positive(),

    difficulty: interviewDifficultySchema,

    isFollowUp: z.boolean(),

    parentQuestionId: z
      .string()
      .uuid()
      .nullable(),

    generatedAt: z.string().datetime(),
  });

// Submit answer request

export const submitInterviewAnswerSchema = z
  .object({
    questionId: z.string().uuid(),

    answer: z
      .string()
      .trim()
      .min(1)
      .max(10000),
  })
  .strict();

// Skip question request

export const skipInterviewQuestionSchema = z
  .object({
    questionId: z.string().uuid(),
  })
  .strict();

// Individual score validation

const scoreSchema = z
  .number()
  .min(0)
  .max(100);

// Evaluation dimensions

export const evaluationScoresSchema = z
  .object({
    accuracy: scoreSchema,

    relevance: scoreSchema,

    completeness: scoreSchema,

    clarity: scoreSchema,
  })
  .strict();

// AI-generated answer evaluation

export const generatedEvaluationSchema = z
  .object({
    scores: evaluationScoresSchema,

    feedback: z
      .string()
      .trim()
      .min(1)
      .max(3000),

    strengths: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .max(10),

    weaknesses: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .max(10),

    missingKeyPoints: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .max(10),

    improvementSuggestions: z
      .array(
        z.string().trim().min(1).max(1000)
      )
      .max(10),

    modelAnswer: z
      .string()
      .trim()
      .min(5)
      .max(5000),

    recommendFollowUp: z.boolean(),

    followUpFocus: z
      .string()
      .trim()
      .max(500)
      .nullable(),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.recommendFollowUp &&
      !data.followUpFocus
    ) {
      context.addIssue({
        code: "custom",
        path: ["followUpFocus"],
        message:
          "Follow-up focus is required when recommending a follow-up",
      });
    }

    if (
      !data.recommendFollowUp &&
      data.followUpFocus !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["followUpFocus"],
        message:
          "Follow-up focus must be null when no follow-up is recommended",
      });
    }
  });

// Persisted answer evaluation

export const interviewEvaluationSchema = z.object({
  scores: evaluationScoresSchema,

  overallScore: scoreSchema,

  feedback: z.string().max(3000),

  strengths: z
    .array(z.string().max(500))
    .max(10),

  weaknesses: z
    .array(z.string().max(500))
    .max(10),

  missingKeyPoints: z
    .array(z.string().max(500))
    .max(10),

  improvementSuggestions: z
    .array(z.string().max(1000))
    .max(10),

  modelAnswer: z.string().max(5000),

  recommendFollowUp: z.boolean(),

  followUpFocus: z
    .string()
    .max(500)
    .nullable(),

  provider: z.enum(["groq", "gemini"]),

  modelUsed: z.string(),

  promptVersion: z.string(),

  processingTime: z.number().nonnegative(),

  evaluatedAt: z.string().datetime(),
});

// Persisted interview answer

export const interviewAnswerSchema = z
  .object({
    questionId: z.string().uuid(),

    answer: z.string().max(10000),

    status: interviewAnswerStatusSchema,

    evaluation:
      interviewEvaluationSchema.nullable(),

    submittedAt: z.string().datetime(),
  })
  .superRefine((data, context) => {
    if (
      data.status === "answered" &&
      (!data.answer.trim() || !data.evaluation)
    ) {
      context.addIssue({
        code: "custom",
        path: ["evaluation"],
        message:
          "Answered questions require an answer and evaluation",
      });
    }

    if (
      data.status === "skipped" &&
      (data.answer !== "" || data.evaluation !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message:
          "Skipped questions cannot contain an answer or evaluation",
      });
    }
  });

// Performance classification

export const performanceLevelSchema = z.enum([
  "excellent",
  "good",
  "average",
  "needs_improvement",
  "poor",
  "not_assessed",
]);

// Topic-level performance

export const topicPerformanceSchema = z.object({
  topic: z.string().min(1).max(150),

  totalQuestions: z.number().int().nonnegative(),

  answeredQuestions: z.number().int().nonnegative(),

  averageScore: scoreSchema.nullable(),
});

// AI-generated report recommendations

export const interviewReportInsightsSchema = z
  .object({
    summary: z
      .string()
      .trim()
      .min(1)
      .max(4000),

    strengths: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .max(10),

    weaknesses: z
      .array(
        z.string().trim().min(1).max(500)
      )
      .max(10),

    priorityTopics: z
      .array(
        z.string().trim().min(1).max(150)
      )
      .max(10),

    recommendations: z
      .array(
        z.string().trim().min(1).max(1000)
      )
      .max(10),
  })
  .strict();

// Final interview report

export const interviewReportSchema =
  interviewReportInsightsSchema.extend({
    totalQuestions: z
      .number()
      .int()
      .nonnegative(),

    answeredQuestions: z
      .number()
      .int()
      .nonnegative(),

    skippedQuestions: z
      .number()
      .int()
      .nonnegative(),

    overallScore: scoreSchema.nullable(),

    averageAccuracy: scoreSchema.nullable(),

    averageRelevance: scoreSchema.nullable(),

    averageCompleteness: scoreSchema.nullable(),

    averageClarity: scoreSchema.nullable(),

    performanceLevel: performanceLevelSchema,

    topicPerformance: z.array(
      topicPerformanceSchema
    ),

    generatedAt: z.string().datetime(),
  });

// TypeScript types

export type InterviewType = z.infer<
  typeof interviewTypeSchema
>;

export type InterviewDifficulty = z.infer<
  typeof interviewDifficultySchema
>;

export type InterviewStatus = z.infer<
  typeof interviewStatusSchema
>;

export type QuestionCategory = z.infer<
  typeof questionCategorySchema
>;

export type CreateInterviewRequest = z.infer<
  typeof createInterviewSchema
>;

export type GeneratedQuestion = z.infer<
  typeof generatedQuestionSchema
>;

export type InterviewQuestion = z.infer<
  typeof interviewQuestionSchema
>;

export type SubmitInterviewAnswer = z.infer<
  typeof submitInterviewAnswerSchema
>;

export type EvaluationScores = z.infer<
  typeof evaluationScoresSchema
>;

export type GeneratedEvaluation = z.infer<
  typeof generatedEvaluationSchema
>;

export type InterviewEvaluation = z.infer<
  typeof interviewEvaluationSchema
>;

export type InterviewAnswer = z.infer<
  typeof interviewAnswerSchema
>;

export type PerformanceLevel = z.infer<
  typeof performanceLevelSchema
>;

export type TopicPerformance = z.infer<
  typeof topicPerformanceSchema
>;

export type InterviewReportInsights = z.infer<
  typeof interviewReportInsightsSchema
>;

export type InterviewReport = z.infer<
  typeof interviewReportSchema
>;
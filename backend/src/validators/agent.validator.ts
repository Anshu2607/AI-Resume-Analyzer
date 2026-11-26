import { z } from "zod";

// =====================================
// MONGODB ID VALIDATION
// =====================================

const objectIdSchema = z
  .string()
  .regex(
    /^[a-fA-F0-9]{24}$/,
    "Invalid MongoDB identifier"
  );

// =====================================
// AVAILABLE AGENT TOOLS
// =====================================

export const agentToolNameSchema = z.enum([
  "get_resume_analysis",
  "search_resume",
  "get_job_match",
  "generate_job_match",
  "get_skill_gaps",
  "generate_roadmap",
  "get_roadmap_progress",
]);

// =====================================
// AGENT EXECUTION STATUS
// =====================================

export const agentStatusSchema = z.enum([
  "pending",
  "planning",
  "executing",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
]);

// =====================================
// TOOL EXECUTION STATUS
// =====================================

export const toolExecutionStatusSchema =
  z.enum([
    "pending",
    "running",
    "completed",
    "failed",
    "skipped",
  ]);

// =====================================
// AGENT REQUEST
// =====================================

export const agentRequestSchema = z.object({

  goal: z
    .string()
    .trim()
    .min(5)
    .max(2000),

  resumeId: objectIdSchema.optional(),

  analysisId: objectIdSchema.optional(),

  jobMatchId: objectIdSchema.optional(),

  roadmapId: objectIdSchema.optional(),

  jobTitle: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .optional(),

  companyName: z
    .string()
    .trim()
    .max(150)
    .optional(),

  jobDescription: z
    .string()
    .trim()
    .min(50)
    .max(20000)
    .optional(),

  learningPreferences: z.object({

    durationWeeks: z
      .number()
      .int()
      .min(1)
      .max(8)
      .default(4),

    hoursPerWeek: z
      .number()
      .int()
      .min(2)
      .max(40)
      .default(10),

    difficulty: z.enum([
      "beginner",
      "intermediate",
      "advanced",
    ]).default("intermediate"),

  }).default({

    durationWeeks: 4,

    hoursPerWeek: 10,

    difficulty: "intermediate",

  }),

  consent: z.literal(true),

});

// =====================================
// TOOL ARGUMENT SCHEMAS
// =====================================

export const resumeAnalysisToolSchema =
  z.object({

    analysisId: objectIdSchema,

  }).strict();

export const resumeSearchToolSchema =
  z.object({

    resumeId: objectIdSchema,

    query: z
      .string()
      .trim()
      .min(3)
      .max(1000),

    limit: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(3),

  }).strict();

export const jobMatchToolSchema =
  z.object({

    jobMatchId: objectIdSchema,

  }).strict();

export const generateJobMatchToolSchema =
  z.object({

    resumeId: objectIdSchema,

  }).strict();

export const skillGapToolSchema =
  z.object({

    jobMatchId: objectIdSchema,

  }).strict();

export const generateRoadmapToolSchema =
  z.object({

    jobMatchId: objectIdSchema,

  }).strict();

export const roadmapProgressToolSchema =
  z.object({

    roadmapId: objectIdSchema,

  }).strict();

// =====================================
// AGENT DECISION: EXECUTE TOOL
// =====================================

export const agentToolDecisionSchema =
  z.object({

    action: z.literal("execute_tool"),

    toolName: agentToolNameSchema,

    arguments: z.record(
      z.string(),
      z.unknown()
    ),

    purpose: z
      .string()
      .trim()
      .min(1)
      .max(500),

  }).strict();

// =====================================
// AGENT DECISION: FINAL RESPONSE
// =====================================

export const agentFinalDecisionSchema =
  z.object({

    action: z.literal("finish"),

    summary: z
      .string()
      .trim()
      .min(1)
      .max(5000),

    recommendations: z
      .array(
        z.string()
          .trim()
          .min(1)
          .max(1000)
      )
      .max(10),

    limitations: z
      .array(
        z.string()
          .trim()
          .min(1)
          .max(1000)
      )
      .max(10),

  }).strict();

// =====================================
// AGENT DECISION: MISSING INFORMATION
// =====================================

export const agentClarificationSchema =
  z.object({

    action: z.literal("request_input"),

    question: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    missingFields: z.array(

      z.enum([
        "resumeId",
        "analysisId",
        "jobMatchId",
        "roadmapId",
        "jobTitle",
        "jobDescription",
      ])

    ).min(1).max(6),

  }).strict();

// =====================================
// COMPLETE AGENT DECISION
// =====================================

export const agentDecisionSchema =
  z.discriminatedUnion(
    "action",
    [

      agentToolDecisionSchema,

      agentFinalDecisionSchema,

      agentClarificationSchema,

    ]
  );

// =====================================
// TOOL EXECUTION RECORD
// =====================================

export const agentExecutionStepSchema =
  z.object({

    stepNumber: z
      .number()
      .int()
      .positive(),

    toolName: agentToolNameSchema,

    purpose: z
      .string()
      .max(500),

    status: toolExecutionStatusSchema,

    startedAt: z.string(),

    completedAt: z
      .string()
      .nullable(),

    durationMs: z
      .number()
      .nonnegative(),

    resultSummary: z
      .string()
      .max(5000)
      .nullable(),

    errorMessage: z
      .string()
      .max(1000)
      .nullable(),

  });

// =====================================
// GENERATED ARTIFACT REFERENCES
// =====================================

export const agentArtifactSchema =
  z.object({

    type: z.enum([
      "resume_analysis",
      "job_match",
      "skill_gap_report",
      "roadmap",
    ]),

    referenceId: objectIdSchema,

    title: z
      .string()
      .trim()
      .min(1)
      .max(200),

  });

// =====================================
// AGENT FINAL RESPONSE
// =====================================

export const agentResponseSchema =
  z.object({

    summary: z
      .string()
      .trim()
      .min(1)
      .max(5000),

    recommendations: z
      .array(z.string())
      .max(10),

    limitations: z
      .array(z.string())
      .max(10),

    artifacts: z
      .array(agentArtifactSchema)
      .max(20),

  });

// =====================================
// TOOL APPROVAL
// =====================================

export const agentApprovalSchema =
  z.object({

    stepNumber: z
      .number()
      .int()
      .positive(),

    approved: z.boolean(),

  }).strict();

// =====================================
// TYPESCRIPT TYPES
// =====================================

export type AgentToolName = z.infer<
  typeof agentToolNameSchema
>;

export type AgentStatus = z.infer<
  typeof agentStatusSchema
>;

export type ToolExecutionStatus = z.infer<
  typeof toolExecutionStatusSchema
>;

export type AgentRequest = z.infer<
  typeof agentRequestSchema
>;

export type AgentDecision = z.infer<
  typeof agentDecisionSchema
>;

export type AgentExecutionStep = z.infer<
  typeof agentExecutionStepSchema
>;

export type AgentArtifact = z.infer<
  typeof agentArtifactSchema
>;

export type AgentResponse = z.infer<
  typeof agentResponseSchema
>;

export type AgentApproval = z.infer<
  typeof agentApprovalSchema
>;
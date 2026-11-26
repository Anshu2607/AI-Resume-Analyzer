export const AI_USAGE_FEATURES = {
  RESUME_ANALYSIS: "RESUME_ANALYSIS",
  RAG_ASSISTANT: "RAG_ASSISTANT",
  JOB_MATCHING: "JOB_MATCHING",
  CAREER_ROADMAP: "CAREER_ROADMAP",
  AGENT_EXECUTION: "AGENT_EXECUTION",
  INTERVIEW_QUESTION: "INTERVIEW_QUESTION",
  INTERVIEW_EVALUATION: "INTERVIEW_EVALUATION",
  INTERVIEW_REPORT: "INTERVIEW_REPORT",
  UNKNOWN: "UNKNOWN",
} as const;

export type AIUsageFeature =
  typeof AI_USAGE_FEATURES[
    keyof typeof AI_USAGE_FEATURES
  ];

export type AIUsageProvider =
  "groq" | "gemini";

export const AI_USAGE_CONFIG = {
  enabled:
    process.env.AI_USAGE_TRACKING_ENABLED !== "false",

  retentionDays: 90,

  pricing: {
    currency: "USD",
    tokensPerUnit: 1_000_000,
  },

  analytics: {
    defaultDays: 30,
    maxDays: 90,
    queryTimeoutMs: 10000,
    cacheTtlSeconds: 60,
  },
} as const;
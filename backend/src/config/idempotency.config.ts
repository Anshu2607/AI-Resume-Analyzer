// =====================================
// IDEMPOTENCY CONFIGURATION
// =====================================

export const IDEMPOTENCY_CONFIG = {
  prefix: "careerlens:idempotency",

  version: "v1",

  headerName: "Idempotency-Key",

  processingTTL: 900,

  completedTTL: 86400,

  minKeyLength: 8,

  maxKeyLength: 128,

  maxResponseBytes: 1024 * 1024,
} as const;

// =====================================
// SUPPORTED OPERATIONS
// =====================================

export const IDEMPOTENCY_OPERATIONS = {
  INTERVIEW_CREATION: "interview-creation",

  INTERVIEW_REPORT: "interview-report",

  BACKGROUND_JOB_SUBMISSION: "background-job-submission",

  RESUME_ANALYSIS: "resume-analysis",

  JOB_MATCHING: "job-matching",

  CAREER_ROADMAP: "career-roadmap",
} as const;

export type IdempotencyOperation =
  (typeof IDEMPOTENCY_OPERATIONS)[keyof
    typeof IDEMPOTENCY_OPERATIONS];
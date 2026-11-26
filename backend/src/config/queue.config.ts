import dotenv from "dotenv";

import type { JobsOptions } from "bullmq";

dotenv.config();

// =====================================
// ENVIRONMENT VALIDATION
// =====================================

const getPositiveInteger = (
  name: string,
  defaultValue: number
): number => {
  const value = Number(
    process.env[name] || defaultValue
  );

  if (
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `Invalid queue configuration: ${name}`
    );
  }

  return value;
};

// =====================================
// QUEUE NAMES
// =====================================

export const QUEUE_NAMES = {
  AI_PROCESSING: "ai-processing",
} as const;

// =====================================
// SUPPORTED BACKGROUND JOB TYPES
// =====================================

export const JOB_TYPES = {
  RESUME_ANALYSIS: "resume-analysis",

  JOB_MATCHING: "job-matching",

  CAREER_ROADMAP: "career-roadmap",

  INTERVIEW_REPORT: "interview-report",
} as const;

export type BackgroundJobType =
  (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

// =====================================
// QUEUE CONFIGURATION
// =====================================

export const QUEUE_CONFIG = {
  prefix:
    process.env.QUEUE_PREFIX || "careerlens",

  concurrency: getPositiveInteger(
    "QUEUE_WORKER_CONCURRENCY",
    2
  ),

  attempts: getPositiveInteger(
    "QUEUE_JOB_ATTEMPTS",
    3
  ),

  backoffDelay: getPositiveInteger(
    "QUEUE_BACKOFF_DELAY",
    5000
  ),

  completedRetention: getPositiveInteger(
    "QUEUE_COMPLETED_RETENTION_SECONDS",
    86400
  ),

  failedRetention: getPositiveInteger(
    "QUEUE_FAILED_RETENTION_SECONDS",
    604800
  ),

  completedJobLimit: 1000,

  failedJobLimit: 5000,

  lockDuration: 120000,

  stalledInterval: 30000,

  maxStalledCount: 1,
} as const;

// =====================================
// DEFAULT JOB OPTIONS
// =====================================

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: QUEUE_CONFIG.attempts,

  backoff: {
    type: "exponential",

    delay: QUEUE_CONFIG.backoffDelay,
  },

  removeOnComplete: {
    age: QUEUE_CONFIG.completedRetention,

    count: QUEUE_CONFIG.completedJobLimit,
  },

  removeOnFail: {
    age: QUEUE_CONFIG.failedRetention,

    count: QUEUE_CONFIG.failedJobLimit,
  },
};

// =====================================
// QUEUE VERSION
// =====================================

export const QUEUE_VERSION = "1.0.0";
import {
  logger,
} from "../config/logger.config.js";

// =====================================
// AI LOGGERS
// =====================================

const aiLogger = logger.child({
  component: "ai-service",
});

const workerLogger = logger.child({
  component: "ai-worker",
});

// =====================================
// AI PROVIDER TYPES
// =====================================

type AIProvider = "groq" | "gemini";

// =====================================
// AI GENERATION STARTED
// =====================================

export const logAIGenerationStarted = (
  provider: AIProvider,
  model: string,
  attempt: number
): void => {

  aiLogger.info(
    {
      event: "AI_GENERATION_STARTED",
      provider,
      model,
      attempt,
    },
    "AI generation started"
  );

};

// =====================================
// AI GENERATION SUCCESS
// =====================================

export const logAIGenerationSuccess = (
  provider: AIProvider,
  model: string,
  durationMs: number
): void => {

  aiLogger.info(
    {
      event: "AI_GENERATION_COMPLETED",
      provider,
      model,
      durationMs,
    },
    "AI generation completed successfully"
  );

};

// =====================================
// AI GENERATION FAILURE
// =====================================

export const logAIGenerationFailure = (
  provider: AIProvider,
  statusCode: number,
  retryable: boolean,
  attempt: number
): void => {

  aiLogger.warn(
    {
      event: "AI_GENERATION_FAILED",
      provider,
      statusCode,
      retryable,
      attempt,
    },
    "AI generation attempt failed"
  );

};

// =====================================
// AI PROVIDER FALLBACK
// =====================================

export const logAIProviderFallback = (
  primaryProvider: AIProvider,
  fallbackProvider: AIProvider
): void => {

  aiLogger.warn(
    {
      event: "AI_PROVIDER_FALLBACK",
      primaryProvider,
      fallbackProvider,
    },
    "Switching to fallback AI provider"
  );

};

// =====================================
// PROMPT SECURITY EVENT
// =====================================

export const logAIPromptSecurity = (
  riskLevel: "low" | "medium" | "high",
  detectedPatterns: readonly string[]
): void => {

  aiLogger.warn(
    {
      event: "AI_PROMPT_SECURITY_EVENT",
      category: "security",
      riskLevel,
      detectedPatterns,
    },
    "Suspicious AI input detected"
  );

};

// =====================================
// BACKGROUND JOB STARTED
// =====================================

export const logJobStarted = (
  jobId: string,
  jobType: string,
  attempt: number
): void => {

  workerLogger.info(
    {
      event: "BACKGROUND_JOB_STARTED",
      jobId,
      jobType,
      attempt,
    },
    "Background job processing started"
  );

};

// =====================================
// BACKGROUND JOB COMPLETED
// =====================================

export const logJobCompleted = (
  jobId: string,
  jobType: string,
  durationMs: number
): void => {

  workerLogger.info(
    {
      event: "BACKGROUND_JOB_COMPLETED",
      jobId,
      jobType,
      durationMs,
    },
    "Background job completed successfully"
  );

};

// =====================================
// BACKGROUND JOB FAILED
// =====================================

export const logJobFailed = (
  jobId: string,
  jobType: string,
  error: unknown,
  attemptsMade: number
): void => {

  workerLogger.error(
    {
      event: "BACKGROUND_JOB_FAILED",
      jobId,
      jobType,
      attemptsMade,

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",
    },
    "Background job processing failed"
  );

};

// =====================================
// WORKER LIFECYCLE LOGGING
// =====================================

export const logWorkerEvent = (
  event:
    | "WORKER_STARTED"
    | "WORKER_READY"
    | "WORKER_CLOSED"
    | "WORKER_ERROR"
): void => {

  const metadata = { event };

  if (event === "WORKER_ERROR") {

    workerLogger.error(
      metadata,
      "AI worker encountered an error"
    );

    return;
  }

  workerLogger.info(
    metadata,
    "AI worker lifecycle event"
  );

};
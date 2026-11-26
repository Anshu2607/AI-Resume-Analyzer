import {
  Worker,
  UnrecoverableError,
} from "bullmq";

import type { Job } from "bullmq";

import {
  workerConnectionOptions,
} from "../config/redis.config.js";

import {
  QUEUE_NAMES,
  QUEUE_CONFIG,
  JOB_TYPES,
} from "../config/queue.config.js";

import type {
  BackgroundJobType,
} from "../config/queue.config.js";

import type {
  AIJobData,
  AIJobResult,
} from "../queues/ai.queue.js";

import {
  generateCachedInterviewReport,
} from "../services/cachedInterviewReport.service.js";

import {
  recordBackgroundActivity,
} from "../services/backgroundActivity.service.js";

import {
  runWithAIUsageContext,
} from "../utils/aiUsageContext.utils.js";

import {
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

import User from "../models/user.model.js";

import {
  logger,
} from "../config/logger.config.js";

import {
  logJobStarted,
  logJobCompleted,
  logJobFailed,
  logWorkerEvent,
} from "../utils/aiLogger.utils.js";

// =====================================
// WORKER LOGGER
// =====================================

const workerLogger = logger.child({
  component: "ai-worker",
});

// =====================================
// WORKER STATE
// =====================================

let aiWorker: Worker<
  AIJobData,
  AIJobResult,
  BackgroundJobType
> | null = null;

const pendingActivityWrites =
  new Set<Promise<void>>();

// =====================================
// TRACK ASYNCHRONOUS ACTIVITY WRITES
// =====================================

const trackActivityWrite = (
  operation: Promise<void>
): void => {

  const task = operation.catch((error) => {

    workerLogger.warn({

      event: "BACKGROUND_ACTIVITY_WRITE_FAILED",

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",

    });

  });

  pendingActivityWrites.add(task);

  void task.then(() => {

    pendingActivityWrites.delete(task);

  });

};

// =====================================
// VALIDATE JOB DATA
// =====================================

const validateJobData = (
  data: AIJobData
): void => {

  const objectIdPattern =
    /^[a-fA-F0-9]{24}$/;

  if (
    !data ||
    typeof data.userId !== "string" ||
    !objectIdPattern.test(data.userId)
  ) {

    throw new UnrecoverableError(
      "Invalid background job user ID"
    );

  }

  if (
    typeof data.resourceId !== "string" ||
    !objectIdPattern.test(data.resourceId)
  ) {

    throw new UnrecoverableError(
      "Invalid background job resource ID"
    );

  }

  if (
    typeof data.requestId !== "string" ||
    !data.requestId.trim()
  ) {

    throw new UnrecoverableError(
      "Invalid background job request ID"
    );

  }

};

// =====================================
// VERIFY BACKGROUND JOB USER
// =====================================

const validateJobUser = async (
  userId: string
): Promise<void> => {

  const user = await User.exists({

    _id: userId,

    role: "user",

    status: "active",

  }).maxTimeMS(10000);

  if (!user) {

    throw new UnrecoverableError(
      "Background job user account is unavailable"
    );

  }

};

// =====================================
// EXTRACT ERROR STATUS
// =====================================

const getErrorStatus = (
  error: unknown
): number | undefined => {

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {

    return error.statusCode;

  }

  return undefined;

};

// =====================================
// IDENTIFY DAILY QUOTA EXHAUSTION
// =====================================

const isDailyQuotaExceeded = (
  error: unknown
): boolean => {

  if (!(error instanceof Error)) {
    return false;
  }

  return (

    getErrorStatus(error) === 429 &&

    (
      error.message ===
        "Daily AI usage limit reached" ||

      error.message ===
        "Daily feature usage limit reached"
    )

  );

};

// =====================================
// HANDLE PROCESSING ERRORS
// =====================================

const handleProcessingError = (
  error: unknown
): never => {

  if (error instanceof UnrecoverableError) {
    throw error;
  }

  const statusCode =
    getErrorStatus(error);

  // Daily quota exhaustion must not trigger
  // immediate background job retries.

  if (isDailyQuotaExceeded(error)) {

    throw new UnrecoverableError(
      "Daily AI quota exhausted. Try again after the quota resets."
    );

  }

  // Permanent errors must not be retried.

  if (
    statusCode !== undefined &&
    statusCode >= 400 &&
    statusCode < 500 &&
    ![408, 409, 429].includes(statusCode)
  ) {

    throw new UnrecoverableError(
      `Background operation rejected (${statusCode})`
    );

  }

  // Temporary errors may be retried.

  throw new Error(

    statusCode
      ? `Background processing failed (${statusCode})`
      : "Background processing failed"

  );

};

// =====================================
// UPDATE JOB PROGRESS
// =====================================

const updateJobProgress = async (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >,

  progress: number

): Promise<void> => {

  try {

    await job.updateProgress(progress);

  } catch {

    workerLogger.warn(

      {

        event: "JOB_PROGRESS_UPDATE_FAILED",

        jobId: job.id || "unknown",

        progress,

      },

      "Unable to update background job progress"

    );

  }

};

// =====================================
// INTERVIEW REPORT PROCESSOR
// =====================================

const processInterviewReport = async (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >

): Promise<AIJobResult> => {

  const {

    userId,

    resourceId,

    requestId,

  } = job.data;

  await updateJobProgress(job, 20);

  // Generate or retrieve the persisted report.
  //
  // Propagate AI usage attribution to all
  // asynchronous LLM calls in this operation.
  //
  // Actual LLM provider attempts consume quota.
  // Cached reports do not require new AI quota.

  await runWithAIUsageContext(

    {

      userId,

      feature:
        AI_USAGE_FEATURES.INTERVIEW_REPORT,

      requestId,

    },

    () => generateCachedInterviewReport(

      userId,

      resourceId

    )

  );

  await updateJobProgress(job, 100);

  return {

    success: true,

    resourceId,

    resultId: resourceId,

    completedAt:
      new Date().toISOString(),

  };

};

// =====================================
// SAFE JOB TYPE FOR LOGGING
// =====================================

const getSafeJobType = (
  jobType: string
): string => {

  const supportedTypes: string[] =
    Object.values(JOB_TYPES);

  return supportedTypes.includes(jobType)
    ? jobType
    : "unknown";

};

// =====================================
// CALCULATE JOB DURATION
// =====================================

const getJobDuration = (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >

): number => {

  const finishedAt =
    job.finishedOn ?? Date.now();

  const startedAt =
    job.processedOn ?? finishedAt;

  return Math.max(

    0,

    finishedAt - startedAt

  );

};

// =====================================
// TRACK SUCCESSFUL BACKGROUND JOB
// =====================================

const trackCompletedJob = async (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >

): Promise<void> => {

  if (!job.id || !job.data?.userId) {
    return;
  }

  await recordBackgroundActivity({

    jobId: job.id,

    userId: job.data.userId,

    jobCreatedAt: job.timestamp,

    outcome: "success",

    durationMs: getJobDuration(job),

    requestId: job.data.requestId,

  });

};

// =====================================
// TRACK TERMINAL JOB FAILURE
// =====================================

const trackFailedJob = async (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >

): Promise<void> => {

  if (!job.id || !job.data?.userId) {
    return;
  }

  // Check the actual BullMQ job state.
  // Retrying jobs must not be counted
  // as terminal failures.

  const state = await job.getState();

  if (state !== "failed") {
    return;
  }

  await recordBackgroundActivity({

    jobId: job.id,

    userId: job.data.userId,

    jobCreatedAt: job.timestamp,

    outcome: "failure",

    durationMs: getJobDuration(job),

    requestId: job.data.requestId,

  });

};

// =====================================
// CENTRAL JOB PROCESSOR
// =====================================

const processAIJob = async (

  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >

): Promise<AIJobResult> => {

  try {

    validateJobData(job.data);

    // Prevent suspended or deleted users
    // from starting previously queued jobs.

    await validateJobUser(
      job.data.userId
    );

    await updateJobProgress(job, 10);

    switch (job.name) {

      case JOB_TYPES.INTERVIEW_REPORT:

        return await processInterviewReport(
          job
        );

      case JOB_TYPES.RESUME_ANALYSIS:

      case JOB_TYPES.JOB_MATCHING:

      case JOB_TYPES.CAREER_ROADMAP:

        throw new UnrecoverableError(
          "This background processor is not implemented yet"
        );

      default:

        throw new UnrecoverableError(
          "Unsupported background job type"
        );

    }

  } catch (error) {

    return handleProcessingError(error);

  }

};

// =====================================
// INITIALIZE AI WORKER
// =====================================

export const initializeAIWorker =
  async (): Promise<void> => {

    if (aiWorker) {

      await aiWorker.waitUntilReady();

      return;

    }

    aiWorker = new Worker<
      AIJobData,
      AIJobResult,
      BackgroundJobType
    >(

      QUEUE_NAMES.AI_PROCESSING,

      processAIJob,

      {

        connection:
          workerConnectionOptions,

        prefix:
          QUEUE_CONFIG.prefix,

        concurrency:
          QUEUE_CONFIG.concurrency,

        lockDuration:
          QUEUE_CONFIG.lockDuration,

        stalledInterval:
          QUEUE_CONFIG.stalledInterval,

        maxStalledCount:
          QUEUE_CONFIG.maxStalledCount,

      }

    );

    // =================================
    // WORKER READY EVENT
    // =================================

    aiWorker.on("ready", () => {

      logWorkerEvent("WORKER_READY");

    });

    // =================================
    // JOB STARTED EVENT
    // =================================

    aiWorker.on("active", (job) => {

      logJobStarted(

        job.id || "unknown",

        getSafeJobType(job.name),

        job.attemptsMade + 1

      );

    });

    // =================================
    // JOB COMPLETED EVENT
    // =================================

    aiWorker.on("completed", (job) => {

      logJobCompleted(

        job.id || "unknown",

        getSafeJobType(job.name),

        getJobDuration(job)

      );

      trackActivityWrite(
        trackCompletedJob(job)
      );

    });

    // =================================
    // JOB FAILED EVENT
    // =================================

    aiWorker.on("failed", (job, error) => {

      logJobFailed(

        job?.id || "unknown",

        getSafeJobType(
          job?.name || "unknown"
        ),

        error,

        job?.attemptsMade ?? 0

      );

      // Only record actual terminal failures.

      if (job) {

        trackActivityWrite(
          trackFailedJob(job)
        );

      }

    });

    // =================================
    // STALLED JOB EVENT
    // =================================

    aiWorker.on("stalled", (jobId) => {

      workerLogger.warn(

        {

          event: "BACKGROUND_JOB_STALLED",

          jobId,

        },

        "Background job stalled"

      );

    });

    // =================================
    // WORKER ERROR EVENT
    // =================================

    aiWorker.on("error", (error) => {

      workerLogger.error(

        {

          event: "WORKER_ERROR",

          errorName: error.name,

        },

        "AI worker encountered an error"

      );

    });

    await aiWorker.waitUntilReady();

    logWorkerEvent("WORKER_STARTED");

    workerLogger.info(

      {

        event: "WORKER_CONFIGURATION",

        concurrency:
          QUEUE_CONFIG.concurrency,

        lockDuration:
          QUEUE_CONFIG.lockDuration,

        stalledInterval:
          QUEUE_CONFIG.stalledInterval,

        maxStalledCount:
          QUEUE_CONFIG.maxStalledCount,

      },

      "AI background worker configuration initialized"

    );

  };

// =====================================
// GET WORKER STATUS
// =====================================

export const isAIWorkerRunning =
  (): boolean => {

    return aiWorker?.isRunning() ?? false;

  };

// =====================================
// GRACEFUL WORKER SHUTDOWN
// =====================================

export const closeAIWorker =
  async (): Promise<void> => {

    if (!aiWorker) {
      return;
    }

    // Stop accepting jobs and allow
    // active jobs to complete.

    await aiWorker.close();

    aiWorker = null;

    // Allow pending background activity
    // writes to finish before database shutdown.

    await Promise.allSettled(

      Array.from(pendingActivityWrites)

    );

    logWorkerEvent("WORKER_CLOSED");

  };
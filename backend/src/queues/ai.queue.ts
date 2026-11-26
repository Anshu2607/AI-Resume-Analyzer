import { Queue } from "bullmq";

import type { JobsOptions } from "bullmq";

import {
  queueConnectionOptions,
} from "../config/redis.config.js";

import {
  QUEUE_NAMES,
  QUEUE_CONFIG,
  DEFAULT_JOB_OPTIONS,
  JOB_TYPES,
} from "../config/queue.config.js";

import type {
  BackgroundJobType,
} from "../config/queue.config.js";

// =====================================
// BACKGROUND JOB DATA
// =====================================

export interface AIJobData {
  userId: string;

  requestId: string;

  resourceId: string;

  createdAt: string;
}

// =====================================
// BACKGROUND JOB RESULT
// =====================================

export interface AIJobResult {
  success: boolean;

  resourceId: string;

  resultId: string;

  completedAt: string;
}

// =====================================
// CREATE AI PROCESSING QUEUE
// =====================================

export const aiQueue = new Queue<
  AIJobData,
  AIJobResult,
  BackgroundJobType
>(
  QUEUE_NAMES.AI_PROCESSING,
  {
    connection: queueConnectionOptions,

    prefix: QUEUE_CONFIG.prefix,

    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

// =====================================
// QUEUE ERROR HANDLING
// =====================================

aiQueue.on("error", (error: Error) => {
  console.error(
    "AI processing queue error:",
    error.message
  );
});

// =====================================
// INITIALIZE AI QUEUE
// =====================================

export const initializeAIQueue =
  async (): Promise<void> => {
    await aiQueue.waitUntilReady();

    console.log(
      "AI processing queue initialized"
    );
  };

// =====================================
// ADD BACKGROUND JOB
// =====================================

export const enqueueAIJob = async (
  jobType: BackgroundJobType,

  data: AIJobData,

  options?: JobsOptions
) => {
  if (
    !Object.values(JOB_TYPES).includes(
      jobType
    )
  ) {
    throw new Error(
      "Unsupported background job type"
    );
  }

  if (
    !data.userId ||
    !data.resourceId ||
    !data.requestId
  ) {
    throw new Error(
      "Invalid background job data"
    );
  }

  const job = await aiQueue.add(
    jobType,
    data,
    options
  );

  return job;
};

// =====================================
// GET BACKGROUND JOB
// =====================================

export const getAIJob = async (
  jobId: string
) => {
  return aiQueue.getJob(jobId);
};

// =====================================
// QUEUE STATISTICS
// =====================================

export const getAIQueueStatistics =
  async () => {
    const counts =
      await aiQueue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused"
      );

    return counts;
  };

// =====================================
// GRACEFUL QUEUE SHUTDOWN
// =====================================

export const closeAIQueue =
  async (): Promise<void> => {
    await aiQueue.close();

    console.log(
      "AI processing queue closed"
    );
  };

export default aiQueue;
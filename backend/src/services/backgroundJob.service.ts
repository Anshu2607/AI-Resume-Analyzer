import { createHash, randomUUID } from "node:crypto";

import type { Job } from "bullmq";

import {
  enqueueAIJob,
  getAIJob,
} from "../queues/ai.queue.js";

import type {
  AIJobData,
  AIJobResult,
} from "../queues/ai.queue.js";

import {
  JOB_TYPES,
} from "../config/queue.config.js";

import type {
  BackgroundJobType,
} from "../config/queue.config.js";

import {
  getInterviewSessionById,
} from "./interviewSession.service.js";

// =====================================
// BACKGROUND JOB ERROR
// =====================================

export class BackgroundJobError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);

    this.name = "BackgroundJobError";
  }
}

// =====================================
// PUBLIC JOB STATUS
// =====================================

export type BackgroundJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "paused"
  | "unknown";

// =====================================
// PUBLIC JOB RESPONSE
// =====================================

export interface BackgroundJobResponse {
  jobId: string;

  jobType: BackgroundJobType;

  resourceId: string;

  requestId: string;

  status: BackgroundJobStatus;

  progress: number;

  attemptsMade: number;

  maxAttempts: number;

  result: AIJobResult | null;

  error: string | null;

  createdAt: string;

  startedAt: string | null;

  completedAt: string | null;
}

// =====================================
// VALIDATE OBJECT ID
// =====================================

const validateObjectId = (
  value: string,
  field: string
): void => {
  if (
    typeof value !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(value)
  ) {
    throw new BackgroundJobError(
      `Invalid ${field}`,
      400
    );
  }
};

// =====================================
// VALIDATE JOB ID
// =====================================

const validateJobId = (
  jobId: string
): void => {
  if (
    typeof jobId !== "string" ||
    !/^ai-[a-f0-9]{64}$/.test(jobId)
  ) {
    throw new BackgroundJobError(
      "Invalid background job ID",
      400
    );
  }
};

// =====================================
// GENERATE DETERMINISTIC JOB ID
// =====================================

const generateJobId = (
  userId: string,
  jobType: BackgroundJobType,
  resourceId: string
): string => {
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        userId.toLowerCase(),
        jobType,
        resourceId.toLowerCase(),
      ])
    )
    .digest("hex");

  return `ai-${hash}`;
};

// =====================================
// NORMALIZE JOB STATUS
// =====================================

const normalizeJobStatus = (
  state: string,
  attemptsMade: number
): BackgroundJobStatus => {
  switch (state) {
    case "waiting":

    case "prioritized":

    case "waiting-children":
      return attemptsMade > 0
        ? "retrying"
        : "queued";

    case "active":
      return "processing";

    case "completed":
      return "completed";

    case "failed":
      return "failed";

    case "delayed":
      return attemptsMade > 0
        ? "retrying"
        : "queued";

    case "paused":
      return "paused";

    default:
      return "unknown";
  }
};

// =====================================
// NORMALIZE JOB PROGRESS
// =====================================

const normalizeProgress = (
  progress: unknown
): number => {
  if (
    typeof progress !== "number" ||
    !Number.isFinite(progress)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(progress))
  );
};

// =====================================
// CONVERT JOB TO PUBLIC RESPONSE
// =====================================

const toPublicJob = async (
  job: Job<
    AIJobData,
    AIJobResult,
    BackgroundJobType
  >
): Promise<BackgroundJobResponse> => {
  const state = await job.getState();

  const status = normalizeJobStatus(
    state,
    job.attemptsMade
  );

  if (!job.id) {
    throw new BackgroundJobError(
      "Background job ID is unavailable",
      500
    );
  }

  return {
    jobId: job.id,

    jobType: job.name,

    resourceId: job.data.resourceId,

    requestId: job.data.requestId,

    status,

    progress:
      status === "completed"
        ? 100
        : normalizeProgress(job.progress),

    attemptsMade: job.attemptsMade,

    maxAttempts: job.opts.attempts ?? 1,

    result:
      status === "completed"
        ? job.returnvalue ?? null
        : null,

    error:
      status === "failed"
        ? "Background processing failed."
        : null,

    createdAt:
      new Date(job.timestamp).toISOString(),

    startedAt:
      job.processedOn
        ? new Date(
            job.processedOn
          ).toISOString()
        : null,

    completedAt:
      job.finishedOn &&
      (
        status === "completed" ||
        status === "failed"
      )
        ? new Date(
            job.finishedOn
          ).toISOString()
        : null,
  };
};

// =====================================
// QUEUE INTERVIEW REPORT GENERATION
// =====================================

export const queueInterviewReport = async (
  userId: string,
  sessionId: string
): Promise<BackgroundJobResponse> => {
  validateObjectId(userId, "user ID");

  validateObjectId(sessionId, "session ID");

  const normalizedUserId =
    userId.toLowerCase();

  const normalizedSessionId =
    sessionId.toLowerCase();

  // Verify that the session belongs
  // to the authenticated user.

  const session =
    await getInterviewSessionById(
      normalizedUserId,
      normalizedSessionId
    );

  if (session.status !== "completed") {
    throw new BackgroundJobError(
      "Complete the interview before requesting a report",
      409
    );
  }

  // Generate a consistent job ID
  // for the same user and session.

  const jobId = generateJobId(
    normalizedUserId,
    JOB_TYPES.INTERVIEW_REPORT,
    normalizedSessionId
  );

  // Return an existing job instead
  // of creating a duplicate.

  const existingJob =
    await getAIJob(jobId);

  if (existingJob) {
    if (
      existingJob.data.userId !==
      normalizedUserId
    ) {
      throw new BackgroundJobError(
        "Background job not found",
        404
      );
    }

    return toPublicJob(existingJob);
  }

  // Prevent conflicts with an existing
  // synchronous report operation.

  if (session.isLocked) {
    throw new BackgroundJobError(
      "Interview session is currently processing",
      409
    );
  }

  // Queue payload contains identifiers
  // rather than private interview content.

  const data: AIJobData = {
    userId: normalizedUserId,

    requestId: randomUUID(),

    resourceId: normalizedSessionId,

    createdAt:
      new Date().toISOString(),
  };

  await enqueueAIJob(
    JOB_TYPES.INTERVIEW_REPORT,
    data,
    {
      jobId,
    }
  );

  // Fetch the stored job to retrieve
  // the actual persisted job data.
  // BullMQ prevents another job with
  // the same ID from being added.

  const storedJob =
    await getAIJob(jobId);

  if (!storedJob) {
    throw new BackgroundJobError(
      "Unable to retrieve the submitted job",
      503
    );
  }

  return toPublicJob(storedJob);
};

// =====================================
// GET BACKGROUND JOB STATUS
// =====================================

export const getBackgroundJobStatus = async (
  userId: string,
  jobId: string
): Promise<BackgroundJobResponse> => {
  validateObjectId(userId, "user ID");

  validateJobId(jobId);

  const job = await getAIJob(jobId);

  if (!job) {
    throw new BackgroundJobError(
      "Background job not found or expired",
      404
    );
  }

  // Prevent unauthorized users from
  // accessing another user's jobs.

  if (
    job.data.userId !==
    userId.toLowerCase()
  ) {
    throw new BackgroundJobError(
      "Background job not found",
      404
    );
  }

  return toPublicJob(job);
};
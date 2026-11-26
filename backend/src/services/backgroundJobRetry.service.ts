import {
  getAIJob,
} from "../queues/ai.queue.js";

import {
  JOB_TYPES,
} from "../config/queue.config.js";

import {
  BackgroundJobError,
  getBackgroundJobStatus,
} from "./backgroundJob.service.js";

import type {
  BackgroundJobResponse,
} from "./backgroundJob.service.js";

import {
  getInterviewSessionById,
} from "./interviewSession.service.js";

// =====================================
// VALIDATE RETRY REQUEST
// =====================================

const validateRetryRequest = (
  userId: string,
  jobId: string
): void => {
  if (
    typeof userId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(userId)
  ) {
    throw new BackgroundJobError(
      "Invalid user ID",
      400
    );
  }

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
// CHECK PERMANENT FAILURE
// =====================================

const isPermanentFailure = (
  reason: string
): boolean => {
  const normalizedReason =
    reason.toLowerCase();

  return [
    "invalid background job",
    "unsupported background job",
    "not implemented yet",
    "background operation rejected",
  ].some((message) =>
    normalizedReason.includes(message)
  );
};

// =====================================
// RETRY FAILED BACKGROUND JOB
// =====================================

export const retryBackgroundJob = async (
  userId: string,
  jobId: string
): Promise<BackgroundJobResponse> => {
  validateRetryRequest(userId, jobId);

  const normalizedUserId =
    userId.toLowerCase();

  // Retrieve existing job.

  const job = await getAIJob(jobId);

  if (
    !job ||
    job.data.userId !== normalizedUserId
  ) {
    throw new BackgroundJobError(
      "Background job not found or expired",
      404
    );
  }

  // Verify current job state.

  const state = await job.getState();

  if (state !== "failed") {
    throw new BackgroundJobError(
      "Only failed background jobs can be retried",
      409
    );
  }

  // Prevent retrying permanent failures.

  if (
    isPermanentFailure(
      job.failedReason || ""
    )
  ) {
    throw new BackgroundJobError(
      "This job failed permanently and cannot be retried",
      422
    );
  }

  // Validate the associated resource.

  switch (job.name) {
    case JOB_TYPES.INTERVIEW_REPORT: {
      const session =
        await getInterviewSessionById(
          normalizedUserId,
          job.data.resourceId
        );

      if (session.status !== "completed") {
        throw new BackgroundJobError(
          "Interview must be completed before generating a report",
          409
        );
      }

      if (session.isLocked) {
        throw new BackgroundJobError(
          "Interview session is currently processing",
          409
        );
      }

      break;
    }

    default:
      throw new BackgroundJobError(
        "Retry is not supported for this job type",
        422
      );
  }

  // ===================================
  // RETRY JOB
  // ===================================

  try {
    await job.retry("failed");

  } catch {
    // Another request may have retried
    // the same job concurrently.

    const latestJob =
      await getAIJob(jobId);

    if (!latestJob) {
      throw new BackgroundJobError(
        "Background job no longer exists",
        404
      );
    }

    const latestState =
      await latestJob.getState();

    if (
      latestState === "waiting" ||
      latestState === "active" ||
      latestState === "delayed" ||
      latestState === "completed" ||
      latestState === "prioritized"
    ) {
      return getBackgroundJobStatus(
        normalizedUserId,
        jobId
      );
    }

    throw new BackgroundJobError(
      "Unable to retry background job",
      503
    );
  }

  console.log(
    `Background job manually retried: ${jobId}`
  );

  // Return the latest persisted state.

  return getBackgroundJobStatus(
    normalizedUserId,
    jobId
  );
};
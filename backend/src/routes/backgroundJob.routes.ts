import { Router } from "express";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  trackPresence,
  trackActivity,
} from "../middleware/activity.middleware.js";

import {
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  createIdempotencyMiddleware,
} from "../middleware/idempotency.middleware.js";

import {
  IDEMPOTENCY_OPERATIONS,
} from "../config/idempotency.config.js";

import {
  queueInterviewReportController,
  getBackgroundJobStatusController,
} from "../controllers/backgroundJob.controller.js";

import {
  retryBackgroundJobController,
} from "../controllers/backgroundJobRetry.controller.js";

const router = Router();

// =====================================
// JOB SUBMISSION RATE LIMITER
// =====================================

const jobSubmissionLimiter =
  createDistributedRateLimiter({

    name: "background-job-submission",

    windowMs: 15 * 60 * 1000,

    max: 20,

    message:
      "Too many background job requests. Please try again later.",

  });

// =====================================
// JOB STATUS RATE LIMITER
// =====================================

const jobStatusLimiter =
  createDistributedRateLimiter({

    name: "background-job-status",

    windowMs: 60 * 1000,

    max: 120,

    message:
      "Too many job status requests. Please try again later.",

  });

// =====================================
// JOB RETRY RATE LIMITER
// =====================================

const jobRetryLimiter =
  createDistributedRateLimiter({

    name: "background-job-retry",

    windowMs: 15 * 60 * 1000,

    max: 5,

    message:
      "Too many background job retry requests. Please try again later.",

  });

// =====================================
// JOB SUBMISSION IDEMPOTENCY
// =====================================

const jobSubmissionIdempotency =
  createIdempotencyMiddleware({

    operation:
      IDEMPOTENCY_OPERATIONS
        .BACKGROUND_JOB_SUBMISSION,

    required: false,

  });

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// QUEUE INTERVIEW REPORT GENERATION
// =====================================

router.post(

  "/interview-report/:sessionId",

  jobSubmissionLimiter,

  jobSubmissionIdempotency,

  trackActivity(
    ACTIVITY_TYPES.BACKGROUND_JOB_SUBMITTED
  ),

  queueInterviewReportController

);

// =====================================
// RETRY FAILED BACKGROUND JOB
// =====================================

router.post(

  "/:jobId/retry",

  jobRetryLimiter,

  retryBackgroundJobController

);

// =====================================
// GET BACKGROUND JOB STATUS
// =====================================

router.get(

  "/:jobId",

  jobStatusLimiter,

  getBackgroundJobStatusController

);

export default router;
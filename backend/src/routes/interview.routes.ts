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
  createInterviewController,
  submitAnswerController,
  skipQuestionController,
  getInterviewsController,
  getInterviewByIdController,
  generateReportController,
  getReportController,
  cancelInterviewController,
  deleteInterviewController,
} from "../controllers/interview.controller.js";

const router = Router();

// =====================================
// INTERVIEW CREATION RATE LIMITER
// =====================================

const interviewCreationLimiter =
  createDistributedRateLimiter({

    name: "interview-creation",

    windowMs: 15 * 60 * 1000,

    max: 5,

    message:
      "Too many interview creation requests. Please try again later.",

  });

// =====================================
// ANSWER SUBMISSION RATE LIMITER
// =====================================

const interviewAnswerLimiter =
  createDistributedRateLimiter({

    name: "interview-answer",

    windowMs: 15 * 60 * 1000,

    max: 40,

    message:
      "Too many interview question requests. Please try again later.",

  });

// =====================================
// REPORT GENERATION RATE LIMITER
// =====================================

const interviewReportLimiter =
  createDistributedRateLimiter({

    name: "interview-report",

    windowMs: 15 * 60 * 1000,

    max: 5,

    message:
      "Too many interview report requests. Please try again later.",

  });

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// CREATE INTERVIEW
// =====================================

router.post(

  "/",

  trackActivity(
    ACTIVITY_TYPES.INTERVIEW_STARTED
  ),

  interviewCreationLimiter,

  createInterviewController

);

// =====================================
// GET INTERVIEW HISTORY
// =====================================

router.get(

  "/",

  getInterviewsController

);

// =====================================
// GET INDIVIDUAL INTERVIEW
// =====================================

router.get(

  "/:sessionId",

  getInterviewByIdController

);

// =====================================
// SUBMIT INTERVIEW ANSWER
// =====================================

router.post(

  "/:sessionId/answer",

  trackActivity(
    ACTIVITY_TYPES.INTERVIEW_ANSWER_SUBMITTED
  ),

  interviewAnswerLimiter,

  submitAnswerController

);

// =====================================
// SKIP INTERVIEW QUESTION
// =====================================

router.post(

  "/:sessionId/skip",

  interviewAnswerLimiter,

  skipQuestionController

);

// =====================================
// GENERATE INTERVIEW REPORT
// =====================================

router.post(

  "/:sessionId/report",

  trackActivity(
    ACTIVITY_TYPES.INTERVIEW_REPORT_GENERATED
  ),

  interviewReportLimiter,

  generateReportController

);

// =====================================
// GET SAVED INTERVIEW REPORT
// =====================================

router.get(

  "/:sessionId/report",

  getReportController

);

// =====================================
// CANCEL INTERVIEW
// =====================================

router.patch(

  "/:sessionId/cancel",

  cancelInterviewController

);

// =====================================
// DELETE INTERVIEW
// =====================================

router.delete(

  "/:sessionId",

  deleteInterviewController

);

export default router;
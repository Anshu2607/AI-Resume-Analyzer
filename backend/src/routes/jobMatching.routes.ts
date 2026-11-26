import { Router } from "express";
import rateLimit from "express-rate-limit";

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
  matchResumeToJobController,
  getJobMatchesController,
  getJobMatchController,
  deleteJobMatchController,
} from "../controllers/jobMatching.controller.js";

const router = Router();

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// JOB MATCHING RATE LIMITER
// =====================================

const jobMatchingLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Job matching limit reached. Please try again later.",

  },

});

// =====================================
// GENERATE JOB MATCHING REPORT
// =====================================

router.post(

  "/",

  trackActivity(
    ACTIVITY_TYPES.JOB_MATCHING
  ),

  jobMatchingLimiter,

  matchResumeToJobController

);

// =====================================
// RETRIEVE ALL JOB MATCHING REPORTS
// =====================================

router.get(

  "/",

  getJobMatchesController

);

// =====================================
// RETRIEVE INDIVIDUAL JOB MATCH
// =====================================

router.get(

  "/:jobMatchId",

  getJobMatchController

);

// =====================================
// DELETE JOB MATCHING REPORT
// =====================================

router.delete(

  "/:jobMatchId",

  deleteJobMatchController

);

export default router;
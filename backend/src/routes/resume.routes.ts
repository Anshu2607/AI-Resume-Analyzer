import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  uploadResume,
} from "../middleware/upload.middleware.js";

import {
  trackPresence,
  trackActivity,
} from "../middleware/activity.middleware.js";

import {
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  uploadResumeController,
  getResumesController,
  getResumeController,
  deleteResumeController,
} from "../controllers/resume.controller.js";

const router = Router();

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// RESUME UPLOAD RATE LIMITER
// =====================================

const uploadLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Too many uploads. Please try again later.",

  },

});

// =====================================
// UPLOAD AND PROCESS RESUME
// =====================================

router.post(

  "/upload",

  trackActivity(
    ACTIVITY_TYPES.RESUME_UPLOADED
  ),

  uploadLimiter,

  uploadResume,

  uploadResumeController

);

// =====================================
// RETRIEVE ALL USER RESUMES
// =====================================

router.get(

  "/",

  getResumesController

);

// =====================================
// RETRIEVE SPECIFIC RESUME
// =====================================

router.get(

  "/:id",

  getResumeController

);

// =====================================
// DELETE RESUME
// =====================================

router.delete(

  "/:id",

  trackActivity(
    ACTIVITY_TYPES.RESUME_DELETED
  ),

  deleteResumeController

);

export default router;
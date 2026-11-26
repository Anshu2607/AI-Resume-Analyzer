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
  analyzeResumeController,
  getAnalysesController,
  getAnalysisController,
  deleteAnalysisController,
} from "../controllers/analysis.controller.js";

const router = Router();

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// AI ANALYSIS RATE LIMITER
// =====================================

const analysisLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "AI analysis limit reached. Please try again later.",

  },

});

// =====================================
// GENERATE AI RESUME ANALYSIS
// =====================================

router.post(

  "/resume/:resumeId",

  trackActivity(
    ACTIVITY_TYPES.RESUME_ANALYZED
  ),

  analysisLimiter,

  analyzeResumeController

);

// =====================================
// RETRIEVE ALL ANALYSIS REPORTS
// =====================================

router.get(

  "/",

  getAnalysesController

);

// =====================================
// RETRIEVE SPECIFIC ANALYSIS
// =====================================

router.get(

  "/:id",

  getAnalysisController

);

// =====================================
// DELETE ANALYSIS REPORT
// =====================================

router.delete(

  "/:id",

  deleteAnalysisController

);

export default router;
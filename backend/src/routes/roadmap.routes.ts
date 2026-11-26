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
  getSkillGapController,
  generateRoadmapController,
  getRoadmapsController,
  getRoadmapController,
  updateProgressController,
  resetProgressController,
  archiveRoadmapController,
  restoreRoadmapController,
  deleteRoadmapController,
} from "../controllers/roadmap.controller.js";

const router = Router();

// =====================================
// ROADMAP GENERATION RATE LIMITER
// =====================================

const roadmapGenerationLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Too many roadmap generation requests. Please try again later.",

  },

});

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// SKILL GAP ANALYSIS
// =====================================

router.get(

  "/skill-gaps/:jobMatchId",

  trackActivity(
    ACTIVITY_TYPES.SKILL_GAP_ANALYSIS
  ),

  getSkillGapController

);

// =====================================
// GENERATE CAREER ROADMAP
// =====================================

router.post(

  "/roadmaps",

  trackActivity(
    ACTIVITY_TYPES.CAREER_ROADMAP
  ),

  roadmapGenerationLimiter,

  generateRoadmapController

);

// =====================================
// RETRIEVE ALL ROADMAPS
// =====================================

router.get(

  "/roadmaps",

  getRoadmapsController

);

// =====================================
// RETRIEVE INDIVIDUAL ROADMAP
// =====================================

router.get(

  "/roadmaps/:roadmapId",

  getRoadmapController

);

// =====================================
// UPDATE LEARNING PROGRESS
// =====================================

router.patch(

  "/roadmaps/:roadmapId/progress",

  updateProgressController

);

// =====================================
// RESET LEARNING PROGRESS
// =====================================

router.patch(

  "/roadmaps/:roadmapId/reset",

  resetProgressController

);

// =====================================
// ARCHIVE ROADMAP
// =====================================

router.patch(

  "/roadmaps/:roadmapId/archive",

  archiveRoadmapController

);

// =====================================
// RESTORE ROADMAP
// =====================================

router.patch(

  "/roadmaps/:roadmapId/restore",

  restoreRoadmapController

);

// =====================================
// DELETE ROADMAP
// =====================================

router.delete(

  "/roadmaps/:roadmapId",

  deleteRoadmapController

);

export default router;
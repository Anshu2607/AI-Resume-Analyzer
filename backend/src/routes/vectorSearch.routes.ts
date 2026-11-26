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
  indexResumeController,
  getIndexingStatusController,
  removeIndexController,
  semanticSearchController,
} from "../controllers/vectorSearch.controller.js";

const router = Router();

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// INDEXING RATE LIMITER
// =====================================

const indexingLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Indexing limit reached. Please try again later.",

  },

});

// =====================================
// SEMANTIC SEARCH RATE LIMITER
// =====================================

const searchLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 30,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Search limit reached. Please try again later.",

  },

});

// =====================================
// GENERATE RESUME EMBEDDINGS
// =====================================

router.post(

  "/index/:resumeId",

  indexingLimiter,

  indexResumeController

);

// =====================================
// RETRIEVE INDEXING STATUS
// =====================================

router.get(

  "/index/:resumeId",

  getIndexingStatusController

);

// =====================================
// REMOVE RESUME EMBEDDINGS
// =====================================

router.delete(

  "/index/:resumeId",

  removeIndexController

);

// =====================================
// PERFORM SEMANTIC SEARCH
// =====================================

router.post(

  "/search/:resumeId",

  trackActivity(
    ACTIVITY_TYPES.VECTOR_SEARCH
  ),

  searchLimiter,

  semanticSearchController

);

export default router;
import { Router } from "express";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  getAdminOverviewController,
  getAdminUsersAnalyticsController,
  getAdminRegistrationsController,
  getAdminEngagementController,
  getAdminFeaturesController,
  getAdminPerformanceController,
  getAdminInterviewsController,
  getAdminBackgroundJobsController,
} from "../controllers/adminAnalytics.controller.js";

const router = Router();

// =====================================
// ANALYTICS RATE LIMITER
// =====================================

const analyticsLimiter =
  createDistributedRateLimiter({

    name: "admin-analytics",

    windowMs: 60 * 1000,

    max: 60,

    message:
      "Too many analytics requests. Please try again later.",

  });

// =====================================
// SHARED ANALYTICS MIDDLEWARE
// =====================================

// JWT, RBAC and MFA protection are
// provided by the parent admin router.

router.use(analyticsLimiter);

router.use((_req, res, next) => {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  next();

});

// =====================================
// ADMINISTRATOR OVERVIEW
// =====================================

router.get(
  "/overview",
  getAdminOverviewController
);

// =====================================
// USER ACCOUNT ANALYTICS
// =====================================

router.get(
  "/users",
  getAdminUsersAnalyticsController
);

// =====================================
// REGISTRATION ANALYTICS
// =====================================

router.get(
  "/registrations",
  getAdminRegistrationsController
);

// =====================================
// USER ENGAGEMENT ANALYTICS
// =====================================

router.get(
  "/engagement",
  getAdminEngagementController
);

// =====================================
// FEATURE USAGE ANALYTICS
// =====================================

router.get(
  "/features",
  getAdminFeaturesController
);

// =====================================
// API PERFORMANCE ANALYTICS
// =====================================

router.get(
  "/performance",
  getAdminPerformanceController
);

// =====================================
// INTERVIEW ANALYTICS
// =====================================

router.get(
  "/interviews",
  getAdminInterviewsController
);

// =====================================
// BACKGROUND JOB ANALYTICS
// =====================================

router.get(
  "/background-jobs",
  getAdminBackgroundJobsController
);

export default router;
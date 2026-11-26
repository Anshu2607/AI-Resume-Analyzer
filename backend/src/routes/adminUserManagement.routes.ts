import { Router } from "express";

import {

  createDistributedRateLimiter,

} from "../middleware/rateLimit.middleware.js";

import {

  ADMIN_USER_MANAGEMENT_CONFIG,

} from "../config/adminUserManagement.config.js";

import {

  getAdminUsersController,

  getAdminUserProfileController,

  getAdminUserActivitiesController,

  suspendUserController,

  reactivateUserController,

} from "../controllers/adminUserManagement.controller.js";

const router = Router();

const readConfig =
  ADMIN_USER_MANAGEMENT_CONFIG.rateLimit.read;

const writeConfig =
  ADMIN_USER_MANAGEMENT_CONFIG.rateLimit.write;

// =====================================
// READ RATE LIMITER
// =====================================

const readLimiter =
  createDistributedRateLimiter({

    name: "admin-user-management-read",

    windowMs: readConfig.windowMs,

    max: readConfig.max,

    message:
      "Too many user management requests. Please try again later.",

  });

// =====================================
// WRITE RATE LIMITER
// =====================================

const writeLimiter =
  createDistributedRateLimiter({

    name: "admin-user-management-write",

    windowMs: writeConfig.windowMs,

    max: writeConfig.max,

    message:
      "Too many account modification requests. Please try again later.",

  });

// =====================================
// PREVENT RESPONSE CACHING
// =====================================

// Authentication and MFA verification
// are enforced by the parent admin router.

router.use((_req, res, next) => {

  res.setHeader(

    "Cache-Control",

    "no-store"

  );

  next();

});

// =====================================
// LIST REGISTERED USERS
// =====================================

router.get(

  "/",

  readLimiter,

  getAdminUsersController

);

// =====================================
// GET USER ACTIVITY HISTORY
// =====================================

router.get(

  "/:userId/activities",

  readLimiter,

  getAdminUserActivitiesController

);

// =====================================
// GET INDIVIDUAL USER PROFILE
// =====================================

router.get(

  "/:userId",

  readLimiter,

  getAdminUserProfileController

);

// =====================================
// SUSPEND USER ACCOUNT
// =====================================

router.patch(

  "/:userId/suspend",

  writeLimiter,

  suspendUserController

);

// =====================================
// REACTIVATE USER ACCOUNT
// =====================================

router.patch(

  "/:userId/reactivate",

  writeLimiter,

  reactivateUserController

);

export default router;
import { Router } from "express";

import {

  adminLogin,

  setupAdminMfa,

  activateMfa,

  verifyAdminMfa,

} from "../controllers/adminAuth.controller.js";

import {

  createDistributedRateLimiter,

} from "../middleware/rateLimit.middleware.js";

import {

  ADMIN_AUTH_CONFIG,

} from "../config/adminAuth.config.js";

const router = Router();

// =====================================
// ADMIN LOGIN RATE LIMITER
// =====================================

const adminLoginLimiter =
  createDistributedRateLimiter({

    name: "admin-auth-login",

    windowMs:
      ADMIN_AUTH_CONFIG.loginRateLimit.windowMs,

    max:
      ADMIN_AUTH_CONFIG.loginRateLimit.max,

    message:
      "Too many administrator login attempts. Please try again later.",

  });

// =====================================
// MFA RATE LIMITER
// =====================================

const adminMfaLimiter =
  createDistributedRateLimiter({

    name: "admin-auth-mfa",

    windowMs:
      ADMIN_AUTH_CONFIG.mfaRateLimit.windowMs,

    max:
      ADMIN_AUTH_CONFIG.mfaRateLimit.max,

    message:
      "Too many authenticator verification attempts. Please try again later.",

  });

// =====================================
// PREVENT AUTHENTICATION RESPONSE CACHING
// =====================================

router.use((_req, res, next) => {

  res.setHeader(
    "Cache-Control",
    "no-store, private"
  );

  res.setHeader(
    "Pragma",
    "no-cache"
  );

  res.setHeader(
    "Expires",
    "0"
  );

  next();

});

// =====================================
// ADMINISTRATOR LOGIN
// =====================================

router.post(

  "/login",

  adminLoginLimiter,

  adminLogin

);

// =====================================
// INITIALIZE MFA ENROLLMENT
// =====================================

router.post(

  "/mfa/setup",

  adminMfaLimiter,

  setupAdminMfa

);

// =====================================
// ACTIVATE MFA ENROLLMENT
// =====================================

router.post(

  "/mfa/activate",

  adminMfaLimiter,

  activateMfa

);

// =====================================
// VERIFY MFA AND ISSUE ADMIN JWT
// =====================================

router.post(

  "/mfa/verify",

  adminMfaLimiter,

  verifyAdminMfa

);

export default router;
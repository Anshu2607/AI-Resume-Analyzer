import { Router } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  revokeAdminSession,
  SessionRevocationError,
} from "../services/sessionRevocation.service.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = Router();

// =====================================
// LOGOUT RATE LIMITER
// =====================================

const logoutLimiter =
  createDistributedRateLimiter({

    name: "admin-session-logout",

    windowMs: 60000,

    max: 20,

    message: "Too many logout requests",

  });

// =====================================
// REVOKE ADMINISTRATOR SESSION
// =====================================

// Protected by the parent administrator router.

router.post(
  "/logout",

  logoutLimiter,

  async (req: AuthenticatedRequest, res) => {

    res.setHeader(
      "Cache-Control",
      "no-store, private"
    );

    if (

      !req.user ||

      req.user.role !== "admin" ||

      req.user.sessionType !== "admin" ||

      req.user.mfaVerified !== true

    ) {

      res.status(403).json({

        success: false,

        message:
          "MFA-verified administrator session required",

      });

      return;
    }

    try {

      await revokeAdminSession(
        req.user
      );

      res.status(200).json({

        success: true,

        message:
          "Administrator session revoked successfully",

        data: {

          loggedOut: true,

          revokedAt:
            new Date().toISOString(),

        },

      });

    } catch (error) {

      if (
        error instanceof SessionRevocationError
      ) {

        res.status(error.statusCode).json({

          success: false,

          message: error.message,

        });

        return;
      }

      res.status(503).json({

        success: false,

        message:
          "Unable to revoke administrator session",

      });

    }
  }
);

export default router;
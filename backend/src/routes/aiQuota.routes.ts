import { Router } from "express";

import User from "../models/user.model.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  getUserAIQuota,
  AIQuotaError,
} from "../services/aiQuota.service.js";

const router = Router();

export const adminAIQuotaRouter = Router();

// =====================================
// RATE LIMITER
// =====================================

const quotaRateLimiter =
  createDistributedRateLimiter({

    name: "ai-quota-read",

    windowMs: 60000,

    max: 60,

    message: "Too many quota requests",

  });

// =====================================
// ERROR HANDLER
// =====================================

const handleQuotaError = (
  error: unknown
): {
  statusCode: number;
  message: string;
} => {

  if (error instanceof AIQuotaError) {

    return {

      statusCode: error.statusCode,

      message: error.message,

    };

  }

  return {

    statusCode: 500,

    message: "Unable to retrieve AI quota information",

  };
};

// =====================================
// REGULAR USER QUOTA
// GET /api/v1/ai-quota
// =====================================

router.get(

  "/",

  authenticate,

  quotaRateLimiter,

  async (req: AuthenticatedRequest, res) => {

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    if (!req.user?.userId) {

      res.status(401).json({

        success: false,

        message: "Authentication required",

      });

      return;
    }

    if (req.user.role !== "user") {

      res.status(403).json({

        success: false,

        message: "Regular user account required",

      });

      return;
    }

    try {

      const quota = await getUserAIQuota(
        req.user.userId
      );

      res.status(200).json({

        success: true,

        message: "AI quota retrieved successfully",

        data: quota,

      });

    } catch (error) {

      const result = handleQuotaError(error);

      res.status(result.statusCode).json({

        success: false,

        message: result.message,

      });

    }
  }
);

// =====================================
// ADMINISTRATOR USER QUOTA
// GET /api/v1/admin/ai-quota/:userId
//
// Protected by parent administrator router.
// =====================================

adminAIQuotaRouter.get(

  "/:userId",

  quotaRateLimiter,

  async (req: AuthenticatedRequest, res) => {

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    if (
      req.user?.role !== "admin" ||
      req.user?.sessionType !== "admin" ||
      req.user?.mfaVerified !== true
    ) {

      res.status(403).json({

        success: false,

        message: "MFA-verified administrator access required",

      });

      return;
    }

    const { userId } = req.params;

    if (
      typeof userId !== "string" ||
      !/^[a-fA-F0-9]{24}$/.test(userId)
    ) {

      res.status(400).json({

        success: false,

        message: "Invalid user identifier",

      });

      return;
    }

    try {

      const user = await User.exists({

        _id: userId,

        role: "user",

      }).maxTimeMS(10000);

      if (!user) {

        res.status(404).json({

          success: false,

          message: "User account not found",

        });

        return;
      }

      const quota = await getUserAIQuota(
        userId
      );

      res.status(200).json({

        success: true,

        message: "User AI quota retrieved successfully",

        data: quota,

      });

    } catch (error) {

      const result = handleQuotaError(error);

      res.status(result.statusCode).json({

        success: false,

        message: result.message,

      });

    }
  }
);

export default router;
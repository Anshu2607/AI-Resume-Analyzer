import { Router } from "express";

import { z } from "zod";

import {
  getAdminAIUsage,
} from "../services/adminAIUsage.service.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

import {
  logApplicationError,
} from "../utils/logger.utils.js";

const router = Router();

// =====================================
// QUERY VALIDATION
// =====================================

const aiUsageQuerySchema = z.object({

  days: z.enum([
    "7",
    "14",
    "30",
    "60",
    "90",
  ])
    .transform(Number)
    .optional()
    .default(30),

  provider: z.enum([
    "groq",
    "gemini",
  ]).optional(),

  userId: z.string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional(),

}).strict();

// =====================================
// RATE LIMITER
// =====================================

const readLimiter =
  createDistributedRateLimiter({

    name: "admin-ai-usage",

    windowMs: 60000,

    max: 60,

    message:
      "Too many AI analytics requests",

  });

// =====================================
// AI USAGE ANALYTICS ENDPOINT
// =====================================

// Protected by the parent administrator router.

router.get(
  "/",
  readLimiter,
  async (req, res) => {

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    const validation =
      aiUsageQuerySchema.safeParse(
        req.query
      );

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message:
          "Invalid AI usage query",

        errors:
          validation.error.issues,
      });

      return;
    }

    try {

      const result =
        await getAdminAIUsage(
          validation.data
        );

      res.status(200).json({

        success: true,

        message:
          "AI usage retrieved successfully",

        data: result,
      });

    } catch (error) {

      logApplicationError(
        error,
        "admin_ai_usage"
      );

      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve AI usage",
      });
    }
  }
);

export default router;
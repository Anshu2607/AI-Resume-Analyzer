import { Router } from "express";
import mongoose from "mongoose";
import os from "node:os";

import redis from "../config/redis.config.js";

import {
  isAIWorkerRunning,
} from "../workers/ai.worker.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = Router();

const limiter = createDistributedRateLimiter({
  name: "admin-system-health",
  windowMs: 60000,
  max: 60,
  message: "Too many system health requests",
});

type ServiceStatus = "healthy" | "unavailable";

interface ServiceHealth {
  status: ServiceStatus;
  latencyMs: number | null;
}

// =====================================
// TIMEOUT WRAPPER
// =====================================

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs = 3000
): Promise<T> => {

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {

    return await Promise.race([

      operation,

      new Promise<never>((_, reject) => {

        timer = setTimeout(
          () => reject(
            new Error("Health check timed out")
          ),
          timeoutMs
        );

      }),

    ]);

  } finally {

    if (timer) {
      clearTimeout(timer);
    }

  }
};

// =====================================
// MONGODB HEALTH CHECK
// =====================================

const checkMongoDB = async (): Promise<ServiceHealth> => {

  if (
    mongoose.connection.readyState !== 1 ||
    !mongoose.connection.db
  ) {

    return {
      status: "unavailable",
      latencyMs: null,
    };

  }

  const start = performance.now();

  try {

    await withTimeout(
      mongoose.connection.db.command({
        ping: 1,
      }),
      3000
    );

    return {
      status: "healthy",
      latencyMs: Math.round(
        performance.now() - start
      ),
    };

  } catch {

    return {
      status: "unavailable",
      latencyMs: null,
    };

  }
};

// =====================================
// REDIS HEALTH CHECK
// =====================================

const checkRedis = async (): Promise<ServiceHealth> => {

  if (redis.status !== "ready") {

    return {
      status: "unavailable",
      latencyMs: null,
    };

  }

  const start = performance.now();

  try {

    const result = await withTimeout(
      redis.ping(),
      3000
    );

    if (result !== "PONG") {

      throw new Error(
        "Unexpected Redis response"
      );

    }

    return {
      status: "healthy",
      latencyMs: Math.round(
        performance.now() - start
      ),
    };

  } catch {

    return {
      status: "unavailable",
      latencyMs: null,
    };

  }
};

// =====================================
// MEMORY CONVERSION
// =====================================

const toMB = (bytes: number): number =>

  Number(
    (bytes / 1024 / 1024).toFixed(2)
  );

// =====================================
// ADMIN SYSTEM HEALTH ENDPOINT
// =====================================

router.get("/", limiter, async (_req, res) => {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  const [
    mongodb,
    redisHealth,
  ] = await Promise.all([

    checkMongoDB(),

    checkRedis(),

  ]);

  const workerRunning =
    isAIWorkerRunning();

  const memory =
    process.memoryUsage();

  const overallStatus =

    mongodb.status === "healthy" &&
    redisHealth.status === "healthy" &&
    workerRunning

      ? "healthy"

      : "degraded";

  res.status(200).json({

    success: true,

    message: "System health retrieved successfully",

    data: {

      status: overallStatus,

      services: {

        api: {
          status: "healthy",
          latencyMs: null,
        },

        mongodb,

        redis: redisHealth,

        worker: {

          status: workerRunning

            ? "healthy"

            : "unavailable",

          running: workerRunning,
        },
      },

      application: {

        uptimeSeconds:
          Math.floor(process.uptime()),

        nodeVersion:
          process.version,

        environment:
          process.env.NODE_ENV ||
          "development",

        deploymentMode:
          process.env.DEPLOYMENT_MODE ||
          "standard",

        platform:
          process.platform,

        architecture:
          process.arch,
      },

      memory: {

        rssMB:
          toMB(memory.rss),

        heapUsedMB:
          toMB(memory.heapUsed),

        heapTotalMB:
          toMB(memory.heapTotal),

        externalMB:
          toMB(memory.external),
      },

      system: {

        logicalCPUs:
          os.availableParallelism(),

        totalMemoryMB:
          toMB(os.totalmem()),

        freeMemoryMB:
          toMB(os.freemem()),
      },

      configuration: {

        primaryAIProvider:
          process.env.LLM_PROVIDER ||
          "groq",

        fallbackAIProvider:
          process.env.LLM_FALLBACK_PROVIDER ||
          "gemini",

        fallbackEnabled:
          process.env.LLM_FALLBACK_ENABLED === "true",

        groqConfigured:
          Boolean(process.env.GROQ_API_KEY),

        geminiConfigured:
          Boolean(process.env.GEMINI_API_KEY),

        aiUsageTrackingEnabled:
          process.env.AI_USAGE_TRACKING_ENABLED !== "false",

        quotaEnabled:
          process.env.AI_QUOTA_ENABLED !== "false",

        pricingConfigured:
          Boolean(process.env.AI_MODEL_PRICING_JSON),
      },

      checkedAt:
        new Date().toISOString(),
    },
  });
});

export default router;
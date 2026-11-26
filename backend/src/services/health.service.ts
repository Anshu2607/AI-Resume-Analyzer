import mongoose from "mongoose";

import redis from "../config/redis.config.js";

import {
  isAIWorkerRunning,
} from "../workers/ai.worker.js";

// =====================================
// HEALTH CHECK TYPES
// =====================================

type ComponentStatus =
  | "healthy"
  | "unhealthy";

interface HealthCheckResult {
  status: ComponentStatus;
  responseTimeMs: number;
}

// =====================================
// HEALTH CHECK TIMEOUT
// =====================================

const HEALTH_CHECK_TIMEOUT_MS = 3000;

const withTimeout = async <T>(
  operation: Promise<T>
): Promise<T> => {

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {

    return await Promise.race([
      operation,

      new Promise<never>((_resolve, reject) => {

        timer = setTimeout(() => {

          reject(
            new Error("Health check timed out")
          );

        }, HEALTH_CHECK_TIMEOUT_MS);

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

const checkMongoDB = async ():
  Promise<HealthCheckResult> => {

  const startedAt = Date.now();

  try {

    if (
      mongoose.connection.readyState !== 1 ||
      !mongoose.connection.db
    ) {
      throw new Error("MongoDB unavailable");
    }

    await withTimeout(
      mongoose.connection.db.admin().ping()
    );

    return {
      status: "healthy",
      responseTimeMs: Date.now() - startedAt,
    };

  } catch {

    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - startedAt,
    };

  }
};

// =====================================
// REDIS HEALTH CHECK
// =====================================

const checkRedis = async ():
  Promise<HealthCheckResult> => {

  const startedAt = Date.now();

  try {

    if (redis.status !== "ready") {
      throw new Error("Redis unavailable");
    }

    const result = await withTimeout(
      redis.ping()
    );

    return {
      status:
        result === "PONG"
          ? "healthy"
          : "unhealthy",

      responseTimeMs: Date.now() - startedAt,
    };

  } catch {

    return {
      status: "unhealthy",
      responseTimeMs: Date.now() - startedAt,
    };

  }
};

// =====================================
// BACKGROUND WORKER HEALTH CHECK
// =====================================

const checkWorker = (): ComponentStatus => {

  return isAIWorkerRunning()
    ? "healthy"
    : "unhealthy";

};

// =====================================
// LIVENESS STATUS
// =====================================

export const getLivenessStatus = () => {

  return {
    success: true,

    status: "healthy",

    uptimeSeconds: Math.floor(
      process.uptime()
    ),

    timestamp: new Date().toISOString(),
  };

};

// =====================================
// READINESS STATUS
// =====================================

export const getReadinessStatus = async () => {

  const [mongodb, redisStatus] =
    await Promise.all([
      checkMongoDB(),
      checkRedis(),
    ]);

  const worker = checkWorker();

  const ready =
    mongodb.status === "healthy" &&
    redisStatus.status === "healthy" &&
    worker === "healthy";

  return {
    success: ready,

    status: ready
      ? "ready"
      : "not_ready",

    components: {
      mongodb,

      redis: redisStatus,

      worker: {
        status: worker,
      },
    },

    timestamp: new Date().toISOString(),
  };

};
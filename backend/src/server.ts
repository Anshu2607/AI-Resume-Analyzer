
import dotenv from "dotenv";
import mongoose from "mongoose";

import type { Server } from "node:http";

import {
  validateEnvironment,
} from "./config/env.config.js";

import {
  logger,
} from "./config/logger.config.js";

// =====================================
// ENVIRONMENT CONFIGURATION
// =====================================

dotenv.config();

try {

  validateEnvironment();

} catch {

  logger.fatal(
    "Server startup blocked due to invalid environment configuration"
  );

  process.exit(1);
}


// =====================================
// SERVER CONFIGURATION
// =====================================

const PORT = Number(process.env.PORT) || 5000;

let server: Server | null = null;

let isShuttingDown = false;

// =====================================
// RESOURCE CLEANUP REFERENCES
// =====================================

let disconnectRedis:
  (() => Promise<void>) | null = null;

let closeAIQueue:
  (() => Promise<void>) | null = null;

let closeAIWorker:
  (() => Promise<void>) | null = null;

// =====================================
// START SERVER
// =====================================

const startServer = async (): Promise<void> => {

  const startupTime = Date.now();

  try {

    logger.info(
      {
        event: "SERVER_INITIALIZING",
      },
      "Initializing CareerLens AI"
    );

    // =================================
    // MONGODB CONNECTION
    // =================================

    const databaseModule =
      await import("./config/database.js");

    await databaseModule.connectDB();

    logger.info(
      {
        event: "DATABASE_CONNECTED",
        component: "mongodb",
      },
      "MongoDB connected successfully"
    );

    if (isShuttingDown) {
      return;
    }

    // =================================
    // REDIS CONNECTION
    // =================================

    const redisModule =
      await import("./config/redis.config.js");

    disconnectRedis =
      redisModule.disconnectRedis;

    await redisModule.connectRedis();

    logger.info(
      {
        event: "REDIS_CONNECTED",
        component: "redis",
      },
      "Redis connected successfully"
    );

    if (isShuttingDown) {
      return;
    }

    // =================================
    // BULLMQ QUEUE INITIALIZATION
    // =================================

    const queueModule =
      await import("./queues/ai.queue.js");

    closeAIQueue =
      queueModule.closeAIQueue;

    await queueModule.initializeAIQueue();

    logger.info(
      {
        event: "QUEUE_INITIALIZED",
        component: "bullmq",
      },
      "AI processing queue initialized"
    );

    if (isShuttingDown) {
      return;
    }

    // =================================
    // AI WORKER INITIALIZATION
    // =================================

    const workerModule =
      await import("./workers/ai.worker.js");

    closeAIWorker =
      workerModule.closeAIWorker;

    await workerModule.initializeAIWorker();

    logger.info(
      {
        event: "WORKER_INITIALIZED",
        component: "ai-worker",
      },
      "AI background worker initialized"
    );

    if (isShuttingDown) {
      return;
    }

    // =================================
    // EXPRESS APPLICATION
    // =================================

    const { default: app } =
      await import("./app.js");

    if (isShuttingDown) {
      return;
    }

    // =================================
    // START HTTP SERVER
    // =================================

    server = app.listen(PORT, () => {

      logger.info(
        {
          event: "SERVER_STARTED",

          port: PORT,

          startupDurationMs:
            Date.now() - startupTime,

          environment:
            process.env.NODE_ENV ||
            "development",

          components: {
            mongodb: "connected",
            redis: "connected",
            queue: "initialized",
            worker: "running",
            security: "enabled",
            logging: "enabled",
          },
        },

        "CareerLens AI backend started successfully"
      );

    });

    server.on("error", (error: Error) => {

      logger.error(
        {
          event: "HTTP_SERVER_ERROR",

          errorName: error.name,
        },

        "HTTP server encountered an error"
      );

      void shutdown("HTTP_SERVER_ERROR", 1);

    });

  } catch (error) {

    logger.fatal(
      {
        event: "STARTUP_FAILURE",

        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",

        startupDurationMs:
          Date.now() - startupTime,
      },

      "Server startup failed"
    );

    await shutdown("STARTUP_FAILURE", 1);

  }
};

// =====================================
// GRACEFUL SHUTDOWN
// =====================================

const shutdown = async (
  signal: string,
  exitCode = 0
): Promise<void> => {

  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  const shutdownTime = Date.now();

  logger.info(
    {
      event: "SHUTDOWN_STARTED",
      signal,
      exitCode,
    },

    "Shutting down CareerLens AI"
  );

  // ===================================
  // FORCE SHUTDOWN TIMEOUT
  // ===================================

  const forceShutdownTimer = setTimeout(() => {

    logger.fatal(
      {
        event: "SHUTDOWN_TIMEOUT",
        timeoutMs: 120000,
      },

      "Graceful shutdown timed out"
    );

    process.exit(1);

  }, 120000);

  forceShutdownTimer.unref();

  let shutdownFailed = false;

  // ===================================
  // SAFE RESOURCE CLEANUP
  // ===================================

  const closeSafely = async (
    resource: string,
    action: () => Promise<void>
  ): Promise<void> => {

    const cleanupTime = Date.now();

    try {

      await action();

      logger.info(
        {
          event: "RESOURCE_CLOSED",

          resource,

          durationMs:
            Date.now() - cleanupTime,
        },

        `${resource} closed successfully`
      );

    } catch (error) {

      shutdownFailed = true;

      logger.error(
        {
          event: "RESOURCE_CLOSE_FAILED",

          resource,

          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },

        "Resource cleanup failed"
      );

    }
  };

  // ===================================
  // 1. STOP HTTP SERVER
  // ===================================

  await closeSafely("HTTP server", async () => {

    if (!server?.listening) {
      return;
    }

    const activeServer = server;

    await new Promise<void>((resolve, reject) => {

      activeServer.close((error) => {

        if (error) {
          reject(error);
          return;
        }

        resolve();

      });

    });

  });

  // ===================================
  // 2. STOP AI WORKER
  // ===================================

  if (closeAIWorker) {

    await closeSafely(
      "AI background worker",
      closeAIWorker
    );

  }

  // ===================================
  // 3. CLOSE BULLMQ QUEUE
  // ===================================

  if (closeAIQueue) {

    await closeSafely(
      "AI processing queue",
      closeAIQueue
    );

  }

  // ===================================
  // 4. CLOSE REDIS CONNECTION
  // ===================================

  if (disconnectRedis) {

    await closeSafely(
      "Redis connection",
      disconnectRedis
    );

  }

  // ===================================
  // 5. CLOSE MONGODB CONNECTION
  // ===================================

  await closeSafely(
    "MongoDB connection",
    async () => {
      await mongoose.disconnect();
    }
  );

  clearTimeout(forceShutdownTimer);

  // ===================================
  // FINAL SHUTDOWN STATUS
  // ===================================

  if (shutdownFailed) {

    logger.error(
      {
        event: "SHUTDOWN_COMPLETED_WITH_ERRORS",

        durationMs:
          Date.now() - shutdownTime,
      },

      "Shutdown completed with errors"
    );

    logger.flush();

    process.exitCode = 1;

    return;
  }

  logger.info(
    {
      event: "SHUTDOWN_COMPLETED",

      durationMs:
        Date.now() - shutdownTime,

      exitCode,
    },

    "Graceful shutdown completed"
  );

  logger.flush();

  process.exitCode = exitCode;

};

// =====================================
// PROCESS SIGNAL HANDLERS
// =====================================

process.on("SIGINT", () => {

  void shutdown("SIGINT");

});

process.on("SIGTERM", () => {

  void shutdown("SIGTERM");

});

// =====================================
// UNHANDLED PROMISE REJECTIONS
// =====================================

process.on("unhandledRejection", (reason) => {

  logger.fatal(
    {
      event: "UNHANDLED_REJECTION",

      errorName:
        reason instanceof Error
          ? reason.name
          : "UnknownError",
    },

    "Unhandled promise rejection detected"
  );

  void shutdown("UNHANDLED_REJECTION", 1);

});

// =====================================
// UNCAUGHT EXCEPTIONS
// =====================================

process.on("uncaughtException", (error) => {

  logger.fatal(
    {
      event: "UNCAUGHT_EXCEPTION",

      errorName: error.name,
    },

    "Uncaught exception detected"
  );

  void shutdown("UNCAUGHT_EXCEPTION", 1);

});

// =====================================
// INITIALIZE APPLICATION
// =====================================

void startServer();
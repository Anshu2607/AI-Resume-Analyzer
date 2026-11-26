import rateLimit from "express-rate-limit";

import { RedisStore } from "rate-limit-redis";

import type {
  RequestHandler,
} from "express";

import redis from "../config/redis.config.js";

// =====================================
// RATE LIMIT CONFIGURATION
// =====================================

interface DistributedRateLimitOptions {
  name: string;

  windowMs: number;

  max: number;

  message?: string;
}

// =====================================
// RATE LIMIT KEY PREFIX
// =====================================

const RATE_LIMIT_PREFIX =
  "careerlens:ratelimit:v1";

// =====================================
// CREATE DISTRIBUTED RATE LIMITER
// =====================================

export const createDistributedRateLimiter = (
  options: DistributedRateLimitOptions
): RequestHandler => {

  // Validate limiter name.

  if (
    !/^[a-zA-Z0-9_-]+$/.test(options.name)
  ) {
    throw new Error(
      "Invalid rate limiter name"
    );
  }

  // Validate time window.

  if (
    !Number.isSafeInteger(options.windowMs) ||
    options.windowMs < 1000
  ) {
    throw new Error(
      "Invalid rate limiter window"
    );
  }

  // Validate maximum requests.

  if (
    !Number.isSafeInteger(options.max) ||
    options.max < 1
  ) {
    throw new Error(
      "Invalid rate limiter request limit"
    );
  }

  // Initialize only when Redis is ready.

  let limiter: RequestHandler | null = null;

  // ===================================
  // BUILD REDIS RATE LIMITER
  // ===================================

  const initializeLimiter = (): RequestHandler => {

    const store = new RedisStore({
      sendCommand: (...args: string[]) => {

        const [command, ...parameters] = args;

        if (!command) {
          throw new Error(
            "Redis command is required"
          );
        }

        return redis.call(
          command,
          ...parameters
        ) as ReturnType<
          RedisStore["sendCommand"]
        >;
      },

      prefix:
        `${RATE_LIMIT_PREFIX}:${options.name}:`,
    });

    return rateLimit({
      windowMs: options.windowMs,

      max: options.max,

      standardHeaders: true,

      legacyHeaders: false,

      store,

      passOnStoreError: false,

      validate: {
        creationStack: false,
      },

      message: {
        success: false,

        message:
          options.message ||
          "Too many requests. Please try again later.",
      },
    });
  };

  // ===================================
  // LAZY INITIALIZATION MIDDLEWARE
  // ===================================

  return (req, res, next): void => {

    // Redis must be available before
    // accessing distributed counters.

    if (redis.status !== "ready") {

      res.status(503).json({
        success: false,

        message:
          "Rate limiting service is temporarily unavailable",
      });

      return;
    }

    try {

      // Initialize each limiter only once.

      if (!limiter) {

        limiter = initializeLimiter();

      }

      // Execute distributed rate limiter.

      void limiter(req, res, next);

    } catch (error) {

      console.error(
        "Distributed rate limiter error:",

        error instanceof Error
          ? error.name
          : "Unknown error"
      );

      if (res.headersSent) {
        next(error);
        return;
      }

      res.status(503).json({
        success: false,

        message:
          "Rate limiting service is temporarily unavailable",
      });
    }
  };
};
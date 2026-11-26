import redis from "../config/redis.config.js";

import {
  ADMIN_ANALYTICS_CONFIG,
} from "../config/adminAnalytics.config.js";

import type {
  AnalyticsPeriod,
} from "../config/adminAnalytics.config.js";

import {
  logger,
} from "../config/logger.config.js";

// =====================================
// ANALYTICS CACHE TYPES
// =====================================

export type AnalyticsCacheType =

  | "overview"

  | "users"

  | "registrations"

  | "engagement"

  | "features"

  | "performance"

  | "interviews"

  | "background-jobs";

// =====================================
// CACHE INPUT INTERFACE
// =====================================

interface AnalyticsCacheInput {

  type: AnalyticsCacheType;

  days: number;

  period?: AnalyticsPeriod;

}

// =====================================
// CACHE LOGGER
// =====================================

const cacheLogger = logger.child({

  component: "admin-analytics-cache",

});

// =====================================
// CACHE KEY PREFIX
// =====================================

const CACHE_PREFIX =

  `${process.env.QUEUE_PREFIX || "careerlens"}:` +

  `${ADMIN_ANALYTICS_CONFIG.cache.prefix}:v1`;

// =====================================
// IN-FLIGHT ANALYTICS REQUESTS
// =====================================

const pendingRequests =
  new Map<string, Promise<unknown>>();

// =====================================
// GENERATE ANALYTICS CACHE KEY
// =====================================

const generateCacheKey = (

  input: AnalyticsCacheInput

): string => {

  return [

    CACHE_PREFIX,

    input.type,

    input.days,

    input.period ?? "summary",

  ].join(":");

};

// =====================================
// RETRIEVE CACHED ANALYTICS
// =====================================

const getCachedAnalytics = async <T>(

  key: string

): Promise<T | null> => {

  if (redis.status !== "ready") {
    return null;
  }

  try {

    const cached =
      await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as T;

  } catch (error) {

    cacheLogger.warn({

      event: "ANALYTICS_CACHE_READ_FAILED",

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",

    });

    return null;

  }

};

// =====================================
// STORE ANALYTICS IN CACHE
// =====================================

const setCachedAnalytics = async <T>(

  key: string,

  data: T

): Promise<void> => {

  if (redis.status !== "ready") {
    return;
  }

  try {

    await redis.set(

      key,

      JSON.stringify(data),

      "EX",

      ADMIN_ANALYTICS_CONFIG
        .cache.ttlSeconds

    );

  } catch (error) {

    cacheLogger.warn({

      event: "ANALYTICS_CACHE_WRITE_FAILED",

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",

    });

  }

};

// =====================================
// GENERATE OR RETRIEVE ANALYTICS
// =====================================

export const getOrSetAnalyticsCache =
  async <T>(

    input: AnalyticsCacheInput,

    loader: () => Promise<T>

  ): Promise<T> => {

    // Bypass caching when disabled.

    if (!ADMIN_ANALYTICS_CONFIG.cache.enabled) {

      return loader();

    }

    const key =
      generateCacheKey(input);

    // Retrieve existing cached response.

    const cached =
      await getCachedAnalytics<T>(key);

    if (cached !== null) {

      return cached;

    }

    // Reuse an ongoing request for
    // the same analytics query.

    const existingRequest =
      pendingRequests.get(key);

    if (existingRequest) {

      return existingRequest as Promise<T>;

    }

    // Execute the MongoDB analytics query.

    const operation = Promise.resolve()
      .then(loader)
      .then(async (result) => {

        await setCachedAnalytics(
          key,
          result
        );

        return result;

      });

    pendingRequests.set(
      key,
      operation
    );

    try {

      return await operation;

    } finally {

      // Always remove completed or failed
      // operations from the pending map.

      if (
        pendingRequests.get(key) === operation
      ) {

        pendingRequests.delete(key);

      }

    }

  };

// =====================================
// INVALIDATE SPECIFIC ANALYTICS CACHE
// =====================================

export const invalidateAnalyticsCache =
  async (

    input: AnalyticsCacheInput

  ): Promise<void> => {

    if (redis.status !== "ready") {
      return;
    }

    try {

      await redis.del(

        generateCacheKey(input)

      );

    } catch (error) {

      cacheLogger.warn({

        event: "ANALYTICS_CACHE_INVALIDATION_FAILED",

        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",

      });

    }

  };
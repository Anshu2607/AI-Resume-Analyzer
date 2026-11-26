import { createHash } from "node:crypto";

import redis from "../config/redis.config.js";

import {
  CACHE_CONFIG,
} from "../config/cache.config.js";

import type {
  CacheResource,
} from "../config/cache.config.js";

// =====================================
// CACHE STATISTICS
// =====================================

interface CacheStatistics {
  hits: number;

  misses: number;

  writes: number;

  invalidations: number;

  errors: number;
}

const statistics: CacheStatistics = {
  hits: 0,

  misses: 0,

  writes: 0,

  invalidations: 0,

  errors: 0,
};

// =====================================
// CACHE KEY GENERATION
// =====================================

export const createCacheKey = (
  resource: CacheResource,

  userId: string,

  resourceId = "default"
): string => {
  if (
    typeof userId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(userId)
  ) {
    throw new Error("Invalid cache user ID");
  }

  const resourceHash = createHash("sha256")
    .update(resourceId)
    .digest("hex");

  return [
    CACHE_CONFIG.prefix,

    CACHE_CONFIG.version,

    resource,

    userId.toLowerCase(),

    resourceHash,
  ].join(":");
};

// =====================================
// CHECK CACHE AVAILABILITY
// =====================================

const isCacheAvailable = (): boolean => {
  return redis.status === "ready";
};

// =====================================
// VALIDATE CACHE KEY
// =====================================

const isValidCacheKey = (
  key: string
): boolean => {
  return key.startsWith(
    `${CACHE_CONFIG.prefix}:${CACHE_CONFIG.version}:`
  );
};

// =====================================
// GET CACHED DATA
// =====================================

export const getCache = async <T>(
  key: string
): Promise<T | null> => {
  if (!isValidCacheKey(key)) {
    throw new Error("Invalid cache key");
  }

  if (!isCacheAvailable()) {
    statistics.misses++;

    return null;
  }

  try {
    const value = await redis.get(key);

    if (value === null) {
      statistics.misses++;

      return null;
    }

    const parsed = JSON.parse(value) as T;

    statistics.hits++;

    return parsed;

  } catch {
    statistics.errors++;

    statistics.misses++;

    return null;
  }
};

// =====================================
// SET CACHED DATA
// =====================================

export const setCache = async <T>(
  key: string,

  value: T,

  ttl: number = CACHE_CONFIG.defaultTTL
): Promise<boolean> => {
  if (!isValidCacheKey(key)) {
    throw new Error("Invalid cache key");
  }

  if (
    !Number.isSafeInteger(ttl) ||
    ttl < 1
  ) {
    throw new Error("Invalid cache TTL");
  }

  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      return false;
    }

    if (
      Buffer.byteLength(serialized, "utf8") >
      CACHE_CONFIG.maxValueBytes
    ) {
      return false;
    }

    await redis.set(
      key,
      serialized,
      "EX",
      ttl
    );

    statistics.writes++;

    return true;

  } catch {
    statistics.errors++;

    return false;
  }
};

// =====================================
// INVALIDATE SINGLE CACHE ENTRY
// =====================================

export const deleteCache = async (
  key: string
): Promise<boolean> => {
  if (!isValidCacheKey(key)) {
    throw new Error("Invalid cache key");
  }

  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const deleted = await redis.del(key);

    statistics.invalidations += deleted;

    return deleted > 0;

  } catch {
    statistics.errors++;

    return false;
  }
};

// =====================================
// INVALIDATE RESOURCE CACHE
// =====================================

export const invalidateResourceCache = async (
  resource: CacheResource,

  userId: string,

  resourceId = "default"
): Promise<boolean> => {
  const key = createCacheKey(
    resource,
    userId,
    resourceId
  );

  return deleteCache(key);
};

// =====================================
// INVALIDATE ALL CACHE ENTRIES
// FOR ONE USER AND RESOURCE TYPE
// =====================================

export const invalidateUserResourceCaches =
  async (
    resource: CacheResource,

    userId: string
  ): Promise<number> => {
    if (
      !/^[a-fA-F0-9]{24}$/.test(userId)
    ) {
      throw new Error("Invalid cache user ID");
    }

    if (!isCacheAvailable()) {
      return 0;
    }

    const pattern = [
      CACHE_CONFIG.prefix,

      CACHE_CONFIG.version,

      resource,

      userId.toLowerCase(),

      "*",
    ].join(":");

    let cursor = "0";

    let deletedCount = 0;

    try {
      do {
        const [nextCursor, keys] =
          await redis.scan(
            cursor,

            "MATCH",
            pattern,

            "COUNT",
            100
          );

        cursor = nextCursor;

        if (keys.length > 0) {
          deletedCount +=
            await redis.del(...keys);
        }

      } while (cursor !== "0");

    } catch {
      statistics.errors++;
    }

    statistics.invalidations += deletedCount;

    return deletedCount;
  };

// =====================================
// CACHE-ASIDE STRATEGY
// =====================================

export const getOrSetCache = async <T>(
  key: string,

  fetchData: () => Promise<T>,

  ttl: number = CACHE_CONFIG.defaultTTL
): Promise<T> => {
  const cachedValue =
    await getCache<T>(key);

  // CACHE HIT

  if (cachedValue !== null) {
    return cachedValue;
  }

  // CACHE MISS
  // Fetch original data from MongoDB
  // or another application service.

  const freshValue = await fetchData();

  // Avoid caching missing resources.

  if (
    freshValue !== null &&
    freshValue !== undefined
  ) {
    await setCache(
      key,
      freshValue,
      ttl
    );
  }

  return freshValue;
};

// =====================================
// CACHE STATISTICS
// =====================================

export const getCacheStatistics = () => {
  const totalRequests =
    statistics.hits +
    statistics.misses;

  const hitRate =
    totalRequests === 0
      ? 0
      : Number(
          (
            (statistics.hits /
              totalRequests) *
            100
          ).toFixed(2)
        );

  return {
    ...statistics,

    totalRequests,

    hitRate,

    redisAvailable:
      isCacheAvailable(),
  };
};
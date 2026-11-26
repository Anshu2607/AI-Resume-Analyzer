import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

import {
  connectTestRedis,
  disconnectTestRedis,
  getTestRedis,
} from "../helpers/testRedis.js";

// =====================================
// REDIRECT CACHE SERVICE TO TEST REDIS
// =====================================

vi.mock("../../src/config/redis.config.js", () => ({
  default: {
    get status() {
      return getTestRedis().status;
    },

    get: (...args: [string]) =>
      getTestRedis().get(...args),

    set: (key: string, value: string, mode: "EX", ttl: number) =>
      getTestRedis().set(key, value, mode, ttl),

    del: (...keys: string[]) =>
      getTestRedis().del(...keys),

    scan: (cursor: string, ...args: ["MATCH", string, "COUNT", number]) =>
      getTestRedis().scan(cursor, ...args),
  },
}));

import {
  createCacheKey,
  getCache,
  setCache,
  deleteCache,
  invalidateResourceCache,
  invalidateUserResourceCaches,
  getOrSetCache,
  getCacheStatistics,
} from "../../src/services/cache.service.js";

import {
  CACHE_CONFIG,
  CACHE_RESOURCES,
} from "../../src/config/cache.config.js";

// =====================================
// TEST CONFIGURATION
// =====================================

const USER_ID =
  "507f1f77bcf86cd799439011";

const OTHER_USER_ID =
  "507f1f77bcf86cd799439012";

const RESOURCE =
  CACHE_RESOURCES.INTERVIEW_REPORT;

const RESOURCE_ID = "test-interview-001";

const cacheKey = createCacheKey(
  RESOURCE,
  USER_ID,
  RESOURCE_ID
);

const testData = {
  overallScore: 85,

  strengths: ["Java", "SQL"],

  weaknesses: ["System Design"],
};

// =====================================
// SAFE CACHE CLEANUP
// =====================================

const clearTestCache = async (): Promise<void> => {
  const redis = getTestRedis();

  const keysToDelete: string[] = [];

  let cursor = "0";

  do {
    const [nextCursor, keys] =
      await redis.scan(
        cursor,
        "MATCH",
        `${CACHE_CONFIG.prefix}:${CACHE_CONFIG.version}:*`,
        "COUNT",
        100
      );

    cursor = nextCursor;

    keysToDelete.push(...keys);

  } while (cursor !== "0");

  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete);
  }
};

// =====================================
// TEST LIFECYCLE
// =====================================

beforeAll(async () => {
  await connectTestRedis();
});

beforeEach(async () => {
  await clearTestCache();
});

afterAll(async () => {
  try {
    await clearTestCache();
  } finally {
    await disconnectTestRedis();
  }
});

// =====================================
// CACHE KEY GENERATION
// =====================================

describe("Cache Key Generation", () => {

  it("generates consistent cache keys", () => {
    const first = createCacheKey(
      RESOURCE,
      USER_ID,
      RESOURCE_ID
    );

    const second = createCacheKey(
      RESOURCE,
      USER_ID,
      RESOURCE_ID
    );

    expect(first).toBe(second);
  });

  it("generates different keys for different users", () => {
    const otherKey = createCacheKey(
      RESOURCE,
      OTHER_USER_ID,
      RESOURCE_ID
    );

    expect(cacheKey).not.toBe(otherKey);
  });

  it("generates different keys for different resources", () => {
    const otherKey = createCacheKey(
      RESOURCE,
      USER_ID,
      "test-interview-002"
    );

    expect(cacheKey).not.toBe(otherKey);
  });

  it("rejects invalid user IDs", () => {
    expect(() =>
      createCacheKey(
        RESOURCE,
        "invalid-user-id",
        RESOURCE_ID
      )
    ).toThrow();
  });

});

// =====================================
// CACHE STORAGE AND RETRIEVAL
// =====================================

describe("Cache Storage and Retrieval", () => {

  it("stores data successfully", async () => {
    const result = await setCache(
      cacheKey,
      testData,
      60
    );

    expect(result).toBe(true);
  });

  it("retrieves previously cached data", async () => {
    await setCache(cacheKey, testData, 60);

    const result = await getCache(cacheKey);

    expect(result).toEqual(testData);
  });

  it("returns null for a cache miss", async () => {
    const result = await getCache(cacheKey);

    expect(result).toBeNull();
  });

  it("updates an existing cached value", async () => {
    await setCache(cacheKey, testData, 60);

    await setCache(
      cacheKey,
      {
        ...testData,
        overallScore: 95,
      },
      60
    );

    const result = await getCache(cacheKey);

    expect(result).toMatchObject({
      overallScore: 95,
    });
  });

  it("deletes cached data", async () => {
    await setCache(cacheKey, testData, 60);

    await deleteCache(cacheKey);

    expect(
      await getCache(cacheKey)
    ).toBeNull();
  });

  it("handles corrupted cached JSON", async () => {
    const redis = getTestRedis();

    await redis.set(
      cacheKey,
      "Invalid JSON content"
    );

    expect(
      await getCache(cacheKey)
    ).toBeNull();
  });

});

// =====================================
// CACHE EXPIRATION
// =====================================

describe("Cache Expiration", () => {

  it("assigns the configured TTL", async () => {
    await setCache(cacheKey, testData, 60);

    const ttl = await getTestRedis().ttl(
      cacheKey
    );

    expect(ttl).toBeGreaterThan(0);

    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("automatically expires cached data", async () => {
    await setCache(cacheKey, testData, 1);

    await expect.poll(
      () => getCache(cacheKey),
      {
        timeout: 4000,
        interval: 100,
      }
    ).toBeNull();
  });

});

// =====================================
// CACHE-ASIDE PATTERN
// =====================================

describe("Cache Aside Pattern", () => {

  it("fetches fresh data on a cache miss", async () => {
    const fetchData = vi.fn()
      .mockResolvedValue(testData);

    const result = await getOrSetCache(
      cacheKey,
      fetchData,
      60
    );

    expect(result).toEqual(testData);

    expect(fetchData)
      .toHaveBeenCalledTimes(1);

    expect(
      await getCache(cacheKey)
    ).toEqual(testData);
  });

  it("avoids fetching data when the cache already contains it", async () => {
    await setCache(cacheKey, testData, 60);

    const fetchData = vi.fn()
      .mockResolvedValue({
        overallScore: 100,
      });

    const result = await getOrSetCache(
      cacheKey,
      fetchData,
      60
    );

    expect(result).toEqual(testData);

    expect(fetchData)
      .not.toHaveBeenCalled();
  });

  it("does not cache failed data fetches", async () => {
    const fetchData = vi.fn()
      .mockRejectedValue(
        new Error("Database unavailable")
      );

    await expect(
      getOrSetCache(
        cacheKey,
        fetchData,
        60
      )
    ).rejects.toThrow("Database unavailable");

    expect(
      await getCache(cacheKey)
    ).toBeNull();
  });

});

// =====================================
// CACHE INVALIDATION
// =====================================

describe("Cache Invalidation", () => {

  it("invalidates a specific resource cache", async () => {
    await setCache(cacheKey, testData, 60);

    await invalidateResourceCache(
      RESOURCE,
      USER_ID,
      RESOURCE_ID
    );

    expect(
      await getCache(cacheKey)
    ).toBeNull();
  });

  it("invalidates multiple resource caches belonging to one user", async () => {
    const secondKey = createCacheKey(
      RESOURCE,
      USER_ID,
      "test-interview-002"
    );

    await setCache(cacheKey, testData, 60);

    await setCache(secondKey, testData, 60);

    await invalidateUserResourceCaches(
      RESOURCE,
      USER_ID
    );

    expect(
      await getCache(cacheKey)
    ).toBeNull();

    expect(
      await getCache(secondKey)
    ).toBeNull();
  });

  it("does not invalidate another user's cached data", async () => {
    const otherKey = createCacheKey(
      RESOURCE,
      OTHER_USER_ID,
      RESOURCE_ID
    );

    await setCache(cacheKey, testData, 60);

    await setCache(otherKey, testData, 60);

    await invalidateUserResourceCaches(
      RESOURCE,
      USER_ID
    );

    expect(
      await getCache(cacheKey)
    ).toBeNull();

    expect(
      await getCache(otherKey)
    ).toEqual(testData);
  });

});

// =====================================
// CACHE STATISTICS
// =====================================

describe("Cache Statistics", () => {

  it("records cache hits", async () => {
    await setCache(cacheKey, testData, 60);

    const before = getCacheStatistics();

    await getCache(cacheKey);

    const after = getCacheStatistics();

    expect(after.hits).toBe(before.hits + 1);
  });

  it("records cache misses", async () => {
    const before = getCacheStatistics();

    await getCache(cacheKey);

    const after = getCacheStatistics();

    expect(after.misses)
      .toBe(before.misses + 1);
  });

  it("reports Redis availability", () => {
    const statistics = getCacheStatistics();

    expect(
      statistics.redisAvailable
    ).toBe(true);
  });

});
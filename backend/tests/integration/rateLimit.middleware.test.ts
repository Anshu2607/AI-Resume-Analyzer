import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";

import {
  connectTestRedis,
  getTestRedis,
  disconnectTestRedis,
} from "../helpers/testRedis.js";

// =====================================
// MOCK REDIS CONNECTION
// =====================================

const redisState = vi.hoisted(() => ({
  available: true,
}));

vi.mock("../../src/config/redis.config.js", () => ({
  default: {
    get status() {
      return redisState.available
        ? getTestRedis().status
        : "end";
    },

    call: (
      command: string,
      ...args: string[]
    ) =>
      getTestRedis().call(
        command,
        ...args
      ),
  },
}));

import {
  createDistributedRateLimiter,
} from "../../src/middleware/rateLimit.middleware.js";

// =====================================
// TEST CONFIGURATION
// =====================================

const PREFIX = "careerlens:ratelimit:v1";

const TEST_NAMESPACE =
  `test-${randomUUID()}`;

// =====================================
// CREATE TEST APPLICATION
// =====================================

const createTestApp = (
  name: string,
  max = 3,
  windowMs = 60000
) => {

  const app = express();

  app.use(express.json());

  const limiter =
    createDistributedRateLimiter({
      name: `${TEST_NAMESPACE}-${name}`,

      windowMs,

      max,

      message: "Request limit exceeded",
    });

  app.get(
    "/protected",
    limiter,
    (_req, res) => {
      res.status(200).json({
        success: true,
        message: "Request successful",
      });
    }
  );

  return app;
};

// =====================================
// CLEANUP TEST RATE LIMIT KEYS
// =====================================

const clearRateLimitKeys =
  async (): Promise<void> => {

    const redis = getTestRedis();

    let cursor = "0";

    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] =
        await redis.scan(
          cursor,
          "MATCH",
          `${PREFIX}:${TEST_NAMESPACE}-*`,
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
  redisState.available = true;

  await clearRateLimitKeys();
});

afterAll(async () => {
  try {
    await clearRateLimitKeys();
  } finally {
    await disconnectTestRedis();
  }
});

// =====================================
// RATE LIMIT CONFIGURATION
// =====================================

describe("Rate Limiter Configuration", () => {

  it("rejects invalid rate limiter names", () => {

    expect(() =>
      createDistributedRateLimiter({
        name: "invalid name!",
        windowMs: 60000,
        max: 5,
      })
    ).toThrow();

  });

  it("rejects invalid time windows", () => {

    expect(() =>
      createDistributedRateLimiter({
        name: "invalid-window",
        windowMs: 0,
        max: 5,
      })
    ).toThrow();

  });

  it("rejects invalid request limits", () => {

    expect(() =>
      createDistributedRateLimiter({
        name: "invalid-limit",
        windowMs: 60000,
        max: 0,
      })
    ).toThrow();

  });

});

// =====================================
// REQUEST RATE LIMITING
// =====================================

describe("Distributed Request Rate Limiting", () => {

  it("allows requests below the configured limit", async () => {

    const app = createTestApp("allowed", 3);

    for (let index = 0; index < 3; index++) {

      const response = await request(app)
        .get("/protected");

      expect(response.status).toBe(200);

    }

  });

  it("blocks requests exceeding the configured limit", async () => {

    const app = createTestApp("blocked", 3);

    for (let index = 0; index < 3; index++) {

      await request(app)
        .get("/protected")
        .expect(200);

    }

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(429);

    expect(response.body.success).toBe(false);

  });

  it("returns the configured rate limit error message", async () => {

    const app = createTestApp("message", 1);

    await request(app)
      .get("/protected")
      .expect(200);

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(429);

    expect(response.body.message).toBe(
      "Request limit exceeded"
    );

  });

  it("includes rate limit response headers", async () => {

    const app = createTestApp("headers", 3);

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(200);

    const rateLimitHeaders =
      Object.keys(response.headers).filter(
        (header) =>
          header.startsWith("ratelimit")
      );

    expect(
      rateLimitHeaders.length
    ).toBeGreaterThan(0);

  });

  it("includes Retry-After when requests are blocked", async () => {

    const app = createTestApp("retry-after", 1);

    await request(app)
      .get("/protected")
      .expect(200);

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(429);

    expect(
      Number(response.headers["retry-after"])
    ).toBeGreaterThan(0);

  });

  it("allows requests again after the rate limit window expires", async () => {

    const app = createTestApp(
      "expiration",
      1,
      1000
    );

    await request(app)
      .get("/protected")
      .expect(200);

    await request(app)
      .get("/protected")
      .expect(429);

    await new Promise((resolve) =>
      setTimeout(resolve, 1200)
    );

    await request(app)
      .get("/protected")
      .expect(200);

  });

});

// =====================================
// DISTRIBUTED RATE LIMIT TESTS
// =====================================

describe("Distributed Rate Limit Isolation", () => {

  it("shares rate limits between separate application instances", async () => {

    const firstApp =
      createTestApp("shared", 3);

    const secondApp =
      createTestApp("shared", 3);

    await request(firstApp)
      .get("/protected")
      .expect(200);

    await request(secondApp)
      .get("/protected")
      .expect(200);

    await request(firstApp)
      .get("/protected")
      .expect(200);

    await request(secondApp)
      .get("/protected")
      .expect(429);

  });

  it("maintains independent limits for different operations", async () => {

    const firstApp =
      createTestApp("interview", 1);

    const secondApp =
      createTestApp("job-matching", 1);

    await request(firstApp)
      .get("/protected")
      .expect(200);

    await request(firstApp)
      .get("/protected")
      .expect(429);

    await request(secondApp)
      .get("/protected")
      .expect(200);

  });

  it("enforces rate limits under concurrent requests", async () => {

    const app =
      createTestApp("concurrency", 5);

    const responses = await Promise.all(
      Array.from(
        { length: 20 },
        () =>
          request(app).get("/protected")
      )
    );

    const allowed = responses.filter(
      (response) =>
        response.status === 200
    );

    const blocked = responses.filter(
      (response) =>
        response.status === 429
    );

    expect(allowed).toHaveLength(5);

    expect(blocked).toHaveLength(15);

  });

});

// =====================================
// REDIS FAILURE HANDLING
// =====================================

describe("Rate Limiter Failure Handling", () => {

  it("rejects requests when Redis is unavailable", async () => {

    redisState.available = false;

    const app =
      createTestApp("unavailable");

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(503);

    expect(response.body.success).toBe(false);

  });

  it("accepts requests after Redis becomes available again", async () => {

    const app =
      createTestApp("recovery");

    redisState.available = false;

    await request(app)
      .get("/protected")
      .expect(503);

    redisState.available = true;

    await request(app)
      .get("/protected")
      .expect(200);

  });

});
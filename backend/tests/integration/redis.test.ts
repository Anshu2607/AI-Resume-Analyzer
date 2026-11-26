import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";

import type { Redis } from "ioredis";

import {
  connectTestRedis,
  clearTestRedis,
  disconnectTestRedis,
} from "../helpers/testRedis.js";

// =====================================
// TEST CONFIGURATION
// =====================================

let redis: Redis;

const PREFIX = "careerlens-test:integration";

const key = (name: string): string =>
  `${PREFIX}:${name}`;

// =====================================
// REDIS INTEGRATION TESTS
// =====================================

describe("Redis Integration", () => {

  beforeAll(async () => {
    redis = await connectTestRedis();
  });

  beforeEach(async () => {
    await clearTestRedis();
  });

  afterAll(async () => {
    try {
      if (redis?.status === "ready") {
        await clearTestRedis();
      }
    } finally {
      await disconnectTestRedis();
    }
  });

  // TEST 1: CONNECTION

  it("connects to the isolated Redis server", async () => {
    expect(await redis.ping()).toBe("PONG");

    expect(redis.options.port).toBe(6380);

    expect(redis.status).toBe("ready");
  });

  // TEST 2: STORE VALUE

  it("stores a string value successfully", async () => {
    const result = await redis.set(
      key("name"),
      "CareerLens AI"
    );

    expect(result).toBe("OK");
  });

  // TEST 3: RETRIEVE VALUE

  it("retrieves a stored value", async () => {
    await redis.set(
      key("role"),
      "Backend Developer"
    );

    const result = await redis.get(
      key("role")
    );

    expect(result).toBe("Backend Developer");
  });

  // TEST 4: UPDATE VALUE

  it("updates an existing value", async () => {
    await redis.set(key("score"), "50");

    await redis.set(key("score"), "85");

    expect(
      await redis.get(key("score"))
    ).toBe("85");
  });

  // TEST 5: DELETE VALUE

  it("deletes an existing key", async () => {
    await redis.set(
      key("temporary"),
      "sample"
    );

    const deleted = await redis.del(
      key("temporary")
    );

    expect(deleted).toBe(1);

    expect(
      await redis.get(key("temporary"))
    ).toBeNull();
  });

  // TEST 6: MISSING KEY

  it("returns null for nonexistent keys", async () => {
    expect(
      await redis.get(key("nonexistent"))
    ).toBeNull();
  });

  // TEST 7: JSON SERIALIZATION

  it("stores and retrieves JSON objects", async () => {
    const data = {
      userId: "test-user",
      overallScore: 85,
      skills: ["Java", "SQL", "Redis"],
    };

    await redis.set(
      key("json"),
      JSON.stringify(data)
    );

    const stored = await redis.get(
      key("json")
    );

    expect(stored).not.toBeNull();

    expect(JSON.parse(stored!)).toEqual(data);
  });

  // TEST 8: TTL CONFIGURATION

  it("assigns an expiration time to a key", async () => {
    await redis.set(
      key("ttl"),
      "temporary-data",
      "EX",
      60
    );

    const ttl = await redis.ttl(
      key("ttl")
    );

    expect(ttl).toBeGreaterThan(0);

    expect(ttl).toBeLessThanOrEqual(60);
  });

  // TEST 9: AUTOMATIC EXPIRATION

  it("automatically removes expired keys", async () => {
    await redis.set(
      key("expiration"),
      "temporary",
      "PX",
      200
    );

    await expect.poll(
      () => redis.get(key("expiration")),
      {
        timeout: 3000,
        interval: 100,
      }
    ).toBeNull();
  });

  // TEST 10: ATOMIC LOCK ACQUISITION

  it("acquires an atomic lock using SET NX", async () => {
    const result = await redis.set(
      key("lock"),
      "worker-1",
      "EX",
      30,
      "NX"
    );

    expect(result).toBe("OK");

    expect(
      await redis.get(key("lock"))
    ).toBe("worker-1");
  });

  // TEST 11: DUPLICATE LOCK PREVENTION

  it("prevents another worker from acquiring an existing lock", async () => {
    await redis.set(
      key("lock"),
      "worker-1",
      "EX",
      30,
      "NX"
    );

    const secondLock = await redis.set(
      key("lock"),
      "worker-2",
      "EX",
      30,
      "NX"
    );

    expect(secondLock).toBeNull();

    expect(
      await redis.get(key("lock"))
    ).toBe("worker-1");
  });

  // TEST 12: LOCK EXPIRATION

  it("allows lock acquisition after expiration", async () => {
    await redis.set(
      key("expiring-lock"),
      "worker-1",
      "PX",
      200,
      "NX"
    );

    await expect.poll(
      () => redis.get(key("expiring-lock")),
      {
        timeout: 3000,
        interval: 100,
      }
    ).toBeNull();

    const secondLock = await redis.set(
      key("expiring-lock"),
      "worker-2",
      "EX",
      30,
      "NX"
    );

    expect(secondLock).toBe("OK");
  });

  // TEST 13: CONCURRENT LOCK ACQUISITION

  it("allows only one concurrent request to acquire a lock", async () => {
    const requests = Array.from(
      { length: 50 },
      (_, index) =>
        redis.set(
          key("concurrent-lock"),
          `worker-${index}`,
          "EX",
          30,
          "NX"
        )
    );

    const results = await Promise.all(requests);

    const successful = results.filter(
      (result) => result === "OK"
    );

    const rejected = results.filter(
      (result) => result === null
    );

    expect(successful).toHaveLength(1);

    expect(rejected).toHaveLength(49);
  });

  // TEST 14: ATOMIC COUNTER

  it("increments counters atomically under concurrent requests", async () => {
    await redis.set(key("counter"), "0");

    await Promise.all(
      Array.from(
        { length: 100 },
        () => redis.incr(key("counter"))
      )
    );

    expect(
      await redis.get(key("counter"))
    ).toBe("100");
  });

  // TEST 15: REDIS TRANSACTIONS

  it("executes multiple commands in a transaction", async () => {
    const results = await redis.multi()
      .set(key("transaction-a"), "10")
      .set(key("transaction-b"), "20")
      .incr(key("transaction-a"))
      .exec();

    expect(results).not.toBeNull();

    expect(results).toHaveLength(3);

    expect(
      results?.every(([error]) => error === null)
    ).toBe(true);

    expect(
      await redis.get(key("transaction-a"))
    ).toBe("11");

    expect(
      await redis.get(key("transaction-b"))
    ).toBe("20");
  });

  // TEST 16: TEST DATA ISOLATION

  it("removes test-prefixed keys during cleanup", async () => {
    await redis.set(
      key("cleanup"),
      "temporary-value"
    );

    await clearTestRedis();

    expect(
      await redis.get(key("cleanup"))
    ).toBeNull();
  });

});
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";

import { randomUUID } from "node:crypto";

import {
  connectTestRedis,
  getTestRedis,
  disconnectTestRedis,
} from "../helpers/testRedis.js";

// =====================================
// REDIRECT TO ISOLATED TEST REDIS
// =====================================

vi.mock("../../src/config/redis.config.js", () => ({
  default: {
    get status() {
      return getTestRedis().status;
    },

    get: (key: string) =>
      getTestRedis().get(key),

    set: (
      key: string,
      value: string,
      mode: "EX",
      ttl: number,
      condition: "NX"
    ) =>
      getTestRedis().set(
        key,
        value,
        mode,
        ttl,
        condition
      ),

    eval: (
      script: string,
      numberOfKeys: number,
      ...args: string[]
    ) =>
      getTestRedis().eval(
        script,
        numberOfKeys,
        ...args
      ),
  },
}));

import {
  acquireIdempotency,
  completeIdempotency,
  releaseIdempotency,
  createRequestFingerprint,
} from "../../src/services/idempotency.service.js";

import {
  IDEMPOTENCY_CONFIG,
  IDEMPOTENCY_OPERATIONS,
} from "../../src/config/idempotency.config.js";

// =====================================
// TEST CONFIGURATION
// =====================================

const USER_ID =
  "507f1f77bcf86cd799439011";

const OTHER_USER_ID =
  "507f1f77bcf86cd799439012";

const OPERATION =
  IDEMPOTENCY_OPERATIONS.BACKGROUND_JOB_SUBMISSION;

const fingerprint = createRequestFingerprint(
  "POST",
  "/api/v1/jobs/interview-report/session-one",
  {}
);

const responseData = {
  success: true,

  data: {
    jobId: "test-background-job",
    status: "queued",
  },
};

let requestKey: string;

// =====================================
// SAFE TEST CLEANUP
// =====================================

const clearIdempotencyKeys =
  async (): Promise<void> => {

    const redis = getTestRedis();

    let cursor = "0";

    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] =
        await redis.scan(
          cursor,
          "MATCH",
          `${IDEMPOTENCY_CONFIG.prefix}:${IDEMPOTENCY_CONFIG.version}:*`,
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
// ACQUIRE LOCK HELPER
// =====================================

const acquireNewLock = async (
  userId = USER_ID,
  key = requestKey
) => {

  const result = await acquireIdempotency(
    userId,
    OPERATION,
    key,
    fingerprint
  );

  if (
    !("redisKey" in result) ||
    !("token" in result)
  ) {
    throw new Error(
      "Expected a newly acquired idempotency lock"
    );
  }

  return result;
};

// =====================================
// TEST LIFECYCLE
// =====================================

beforeAll(async () => {
  await connectTestRedis();
});

beforeEach(async () => {
  await clearIdempotencyKeys();

  requestKey = randomUUID();
});

afterAll(async () => {
  try {
    await clearIdempotencyKeys();
  } finally {
    await disconnectTestRedis();
  }
});

// =====================================
// IDEMPOTENCY ACQUISITION
// =====================================

describe("Idempotency Lock Acquisition", () => {

  it("acquires a new idempotency lock", async () => {

    const result = await acquireNewLock();

    expect(result.redisKey).toBeDefined();

    expect(result.token).toBeDefined();

    const stored = await getTestRedis().get(
      result.redisKey
    );

    expect(stored).not.toBeNull();

    expect(JSON.parse(stored!)).toMatchObject({
      status: "processing",
      fingerprint,
      token: result.token,
    });

  });

  it("prevents duplicate processing of the same request", async () => {

    await acquireNewLock();

    const duplicate = await acquireIdempotency(
      USER_ID,
      OPERATION,
      requestKey,
      fingerprint
    );

    expect(duplicate.status).toBe(
      "processing"
    );

  });

  it("rejects the same key with a different request fingerprint", async () => {

    await acquireNewLock();

    const differentFingerprint =
      createRequestFingerprint(
        "POST",
        "/api/v1/jobs/interview-report/session-two",
        {}
      );

    await expect(
      acquireIdempotency(
        USER_ID,
        OPERATION,
        requestKey,
        differentFingerprint
      )
    ).rejects.toMatchObject({
      statusCode: 409,
    });

  });

  it("isolates idempotency keys between users", async () => {

    const first = await acquireNewLock(
      USER_ID
    );

    const second = await acquireNewLock(
      OTHER_USER_ID
    );

    expect(first.redisKey)
      .not.toBe(second.redisKey);

    expect(first.token)
      .not.toBe(second.token);

  });

  it("assigns a processing TTL to new locks", async () => {

    const result = await acquireNewLock();

    const ttl = await getTestRedis().ttl(
      result.redisKey
    );

    expect(ttl).toBeGreaterThan(0);

    expect(ttl).toBeLessThanOrEqual(
      IDEMPOTENCY_CONFIG.processingTTL
    );

  });

});

// =====================================
// COMPLETION AND RESPONSE REPLAY
// =====================================

describe("Idempotency Completion and Replay", () => {

  it("successfully completes an acquired request", async () => {

    const lock = await acquireNewLock();

    const completed = await completeIdempotency(
      lock.redisKey,
      lock.token,
      fingerprint,
      202,
      responseData
    );

    expect(completed).toBe(true);

    const stored = await getTestRedis().get(
      lock.redisKey
    );

    expect(JSON.parse(stored!)).toMatchObject({
      status: "completed",
      statusCode: 202,
      response: responseData,
    });

  });

  it("replays the response of a completed request", async () => {

    const lock = await acquireNewLock();

    await completeIdempotency(
      lock.redisKey,
      lock.token,
      fingerprint,
      202,
      responseData
    );

    const replay = await acquireIdempotency(
      USER_ID,
      OPERATION,
      requestKey,
      fingerprint
    );

    expect(replay).toMatchObject({
      status: "completed",
      statusCode: 202,
      response: responseData,
    });

  });

  it("rejects completion using an incorrect lock token", async () => {

    const lock = await acquireNewLock();

    const completed = await completeIdempotency(
      lock.redisKey,
      randomUUID(),
      fingerprint,
      202,
      responseData
    );

    expect(completed).toBe(false);

    const stored = await getTestRedis().get(
      lock.redisKey
    );

    expect(JSON.parse(stored!)).toMatchObject({
      status: "processing",
      token: lock.token,
    });

  });

  it("does not cache unsuccessful HTTP responses", async () => {

    const lock = await acquireNewLock();

    const completed = await completeIdempotency(
      lock.redisKey,
      lock.token,
      fingerprint,
      500,
      {
        success: false,
        message: "Internal server error",
      }
    );

    expect(completed).toBe(false);

    const stored = await getTestRedis().get(
      lock.redisKey
    );

    expect(JSON.parse(stored!).status)
      .toBe("processing");

  });

  it("assigns the completed response TTL", async () => {

    const lock = await acquireNewLock();

    await completeIdempotency(
      lock.redisKey,
      lock.token,
      fingerprint,
      202,
      responseData
    );

    const ttl = await getTestRedis().ttl(
      lock.redisKey
    );

    expect(ttl).toBeGreaterThan(
      IDEMPOTENCY_CONFIG.processingTTL
    );

    expect(ttl).toBeLessThanOrEqual(
      IDEMPOTENCY_CONFIG.completedTTL
    );

  });

});

// =====================================
// LOCK RELEASE AND RECOVERY
// =====================================

describe("Idempotency Lock Release", () => {

  it("releases a lock using its correct token", async () => {

    const lock = await acquireNewLock();

    await releaseIdempotency(
      lock.redisKey,
      lock.token
    );

    expect(
      await getTestRedis().get(lock.redisKey)
    ).toBeNull();

  });

  it("prevents lock release using an incorrect token", async () => {

    const lock = await acquireNewLock();

    await releaseIdempotency(
      lock.redisKey,
      randomUUID()
    );

    const stored = await getTestRedis().get(
      lock.redisKey
    );

    expect(stored).not.toBeNull();

    expect(JSON.parse(stored!).token)
      .toBe(lock.token);

  });

  it("allows reacquisition after releasing a lock", async () => {

    const first = await acquireNewLock();

    await releaseIdempotency(
      first.redisKey,
      first.token
    );

    const second = await acquireNewLock();

    expect(second.redisKey)
      .toBe(first.redisKey);

    expect(second.token)
      .not.toBe(first.token);

  });

  it("allows reacquisition after a lock expires", async () => {

    const first = await acquireNewLock();

    // Shorten TTL only for this isolated test.

    await getTestRedis().pexpire(
      first.redisKey,
      200
    );

    await expect.poll(
      () =>
        getTestRedis().get(first.redisKey),
      {
        timeout: 3000,
        interval: 100,
      }
    ).toBeNull();

    const second = await acquireNewLock();

    expect(second.token)
      .not.toBe(first.token);

  });

  it("prevents an old worker from releasing a replacement lock", async () => {

    const first = await acquireNewLock();

    await releaseIdempotency(
      first.redisKey,
      first.token
    );

    const second = await acquireNewLock();

    await releaseIdempotency(
      first.redisKey,
      first.token
    );

    const stored = await getTestRedis().get(
      second.redisKey
    );

    expect(JSON.parse(stored!).token)
      .toBe(second.token);

  });

});

// =====================================
// CONCURRENT REQUEST TESTS
// =====================================

describe("Idempotency Concurrency", () => {

  it("allows only one of 50 concurrent requests to acquire a lock", async () => {

    const requests = Array.from(
      { length: 50 },
      () =>
        acquireIdempotency(
          USER_ID,
          OPERATION,
          requestKey,
          fingerprint
        )
    );

    const results = await Promise.all(
      requests
    );

    const acquired = results.filter(
      (result) =>
        "redisKey" in result &&
        "token" in result
    );

    const processing = results.filter(
      (result) =>
        result.status === "processing" &&
        !("token" in result)
    );

    expect(acquired).toHaveLength(1);

    expect(processing).toHaveLength(49);

  });

  it("replays completed responses to concurrent duplicate requests", async () => {

    const lock = await acquireNewLock();

    await completeIdempotency(
      lock.redisKey,
      lock.token,
      fingerprint,
      202,
      responseData
    );

    const results = await Promise.all(
      Array.from(
        { length: 20 },
        () =>
          acquireIdempotency(
            USER_ID,
            OPERATION,
            requestKey,
            fingerprint
          )
      )
    );

    expect(results).toHaveLength(20);

    for (const result of results) {
      expect(result).toMatchObject({
        status: "completed",
        statusCode: 202,
        response: responseData,
      });
    }

  });

});
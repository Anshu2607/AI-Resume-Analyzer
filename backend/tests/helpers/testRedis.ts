import { Redis } from "ioredis";

let testRedis: Redis | null = null;

// =====================================
// CONNECT ISOLATED REDIS
// =====================================

export const connectTestRedis =
  async (): Promise<Redis> => {

    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "Redis testing requires NODE_ENV=test"
      );
    }

    if (testRedis?.status === "ready") {
      return testRedis;
    }

    const client = new Redis({
      host: "127.0.0.1",

      port: 6380,

      db: 0,

      lazyConnect: true,

      connectTimeout: 5000,

      maxRetriesPerRequest: 1,

      enableOfflineQueue: false,

      retryStrategy: () => null,
    });

    try {
      await client.connect();

      const response = await client.ping();

      if (response !== "PONG") {
        throw new Error(
          "Test Redis health check failed"
        );
      }

      testRedis = client;

      console.log(
        "Isolated test Redis connected"
      );

      return client;

    } catch (error) {

      client.disconnect();

      throw error;
    }
  };

// =====================================
// GET TEST REDIS CLIENT
// =====================================

export const getTestRedis = (): Redis => {

  if (
    process.env.NODE_ENV !== "test" ||
    !testRedis ||
    testRedis.status !== "ready" ||
    testRedis.options.host !== "127.0.0.1" ||
    testRedis.options.port !== 6380
  ) {
    throw new Error(
      "Unsafe Redis operation prevented"
    );
  }

  return testRedis;
};

// =====================================
// CLEAR TEST KEYS
// =====================================

export const clearTestRedis =
  async (): Promise<void> => {

    const redis = getTestRedis();

    let cursor = "0";

    do {

      const [nextCursor, keys] =
        await redis.scan(
          cursor,
          "MATCH",
          "careerlens-test:*",
          "COUNT",
          100
        );

      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
      }

    } while (cursor !== "0");
  };

// =====================================
// DISCONNECT TEST REDIS
// =====================================

export const disconnectTestRedis =
  async (): Promise<void> => {

    const client = testRedis;

    testRedis = null;

    if (!client) {
      return;
    }

    try {

      if (client.status === "ready") {
        await client.quit();
      } else {
        client.disconnect();
      }

    } catch {

      client.disconnect();
    }

    console.log(
      "Isolated test Redis disconnected"
    );
  };
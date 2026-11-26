import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";

import dotenv from "dotenv";

dotenv.config();

// =====================================
// ENVIRONMENT CONFIGURATION
// =====================================

const redisHost =
  process.env.REDIS_HOST || "127.0.0.1";

const redisPort = Number(
  process.env.REDIS_PORT || 6379
);

const redisPassword =
  process.env.REDIS_PASSWORD || undefined;

const redisDatabase = Number(
  process.env.REDIS_DB || 0
);

// =====================================
// CONFIGURATION VALIDATION
// =====================================

if (
  !Number.isInteger(redisPort) ||
  redisPort < 1 ||
  redisPort > 65535
) {
  throw new Error("Invalid REDIS_PORT");
}

if (
  !Number.isInteger(redisDatabase) ||
  redisDatabase < 0
) {
  throw new Error("Invalid REDIS_DB");
}

// =====================================
// BASE CONNECTION OPTIONS
// =====================================

const baseRedisOptions: RedisOptions = {
  host: redisHost,

  port: redisPort,

  password: redisPassword,

  db: redisDatabase,

  connectTimeout: 10000,

  enableReadyCheck: true,

  retryStrategy(times: number) {
    return Math.min(times * 200, 5000);
  },
};

// =====================================
// APPLICATION REDIS CONNECTION
// =====================================

export const redis = new Redis({
  ...baseRedisOptions,

  lazyConnect: true,

  maxRetriesPerRequest: 3,

  enableOfflineQueue: false,
});

// =====================================
// CONNECTION EVENT HANDLERS
// =====================================

redis.on("connect", () => {
  console.log("Redis connection established");
});

redis.on("ready", () => {
  console.log("Redis is ready");
});

redis.on("error", (error: Error) => {
  console.error(
    "Redis connection error:",
    error.message
  );
});

redis.on("reconnecting", () => {
  console.warn("Redis reconnecting...");
});

redis.on("close", () => {
  console.warn("Redis connection closed");
});

// =====================================
// BULLMQ QUEUE CONNECTION OPTIONS
// =====================================

export const queueConnectionOptions: RedisOptions = {
  ...baseRedisOptions,

  maxRetriesPerRequest: 1,

  enableOfflineQueue: false,
};

// =====================================
// BULLMQ WORKER CONNECTION OPTIONS
// =====================================

export const workerConnectionOptions: RedisOptions = {
  ...baseRedisOptions,

  maxRetriesPerRequest: null,

  enableOfflineQueue: true,
};

// =====================================
// INITIALIZE REDIS CONNECTION
// =====================================

export const connectRedis = async (): Promise<void> => {
  try {
    if (
      redis.status === "wait" ||
      redis.status === "end"
    ) {
      await redis.connect();
    }

    const response = await redis.ping();

    if (response !== "PONG") {
      throw new Error(
        "Unexpected Redis ping response"
      );
    }

    console.log(
      "Redis connection verified successfully"
    );

  } catch (error) {
    console.error(
      "Failed to initialize Redis:",
      error instanceof Error
        ? error.message
        : "Unknown Redis error"
    );

    throw error;
  }
};

// =====================================
// REDIS HEALTH CHECK
// =====================================

export const isRedisHealthy =
  async (): Promise<boolean> => {
    try {
      if (redis.status !== "ready") {
        return false;
      }

      const response = await redis.ping();

      return response === "PONG";

    } catch {
      return false;
    }
  };

// =====================================
// REDIS CONNECTION STATUS
// =====================================

export const getRedisStatus = (): string => {
  return redis.status;
};

// =====================================
// GRACEFUL SHUTDOWN
// =====================================

export const disconnectRedis =
  async (): Promise<void> => {
    try {
      if (redis.status === "end") {
        return;
      }

      if (redis.status === "ready") {
        await redis.quit();
      } else {
        redis.disconnect();
      }

      console.log(
        "Redis disconnected successfully"
      );

    } catch {
      redis.disconnect();
    }
  };

export default redis;
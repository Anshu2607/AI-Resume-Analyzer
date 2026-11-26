import {
  createHash,
  randomUUID,
} from "node:crypto";

import redis from "../config/redis.config.js";

import {
  IDEMPOTENCY_CONFIG,
} from "../config/idempotency.config.js";

import type {
  IdempotencyOperation,
} from "../config/idempotency.config.js";

// =====================================
// IDEMPOTENCY ERROR
// =====================================

export class IdempotencyError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);

    this.name = "IdempotencyError";
  }
}

// =====================================
// IDEMPOTENCY RECORD
// =====================================

interface ProcessingRecord {
  status: "processing";

  fingerprint: string;

  token: string;

  createdAt: string;
}

interface CompletedRecord {
  status: "completed";

  fingerprint: string;

  statusCode: number;

  response: unknown;

  createdAt: string;

  completedAt: string;
}

type IdempotencyRecord =
  | ProcessingRecord
  | CompletedRecord;

// =====================================
// ACQUIRE RESULT
// =====================================

export type AcquireIdempotencyResult =
  | {
      status: "acquired";

      redisKey: string;

      token: string;

      fingerprint: string;
    }
  | {
      status: "processing";
    }
  | {
      status: "completed";

      statusCode: number;

      response: unknown;
    };

// =====================================
// VALIDATE IDEMPOTENCY KEY
// =====================================

export const validateIdempotencyKey = (
  key: string
): void => {
  if (
    typeof key !== "string" ||
    key.length <
      IDEMPOTENCY_CONFIG.minKeyLength ||
    key.length >
      IDEMPOTENCY_CONFIG.maxKeyLength ||
    !/^[a-zA-Z0-9_-]+$/.test(key)
  ) {
    throw new IdempotencyError(
      "Invalid Idempotency-Key",
      400
    );
  }
};

// =====================================
// VALIDATE USER ID
// =====================================

const validateUserId = (
  userId: string
): void => {
  if (
    typeof userId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(userId)
  ) {
    throw new IdempotencyError(
      "Invalid user ID",
      400
    );
  }
};

// =====================================
// CANONICAL JSON SERIALIZATION
// =====================================

const canonicalize = (
  value: unknown
): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>
      )
        .sort(([first], [second]) =>
          first < second
            ? -1
            : first > second
              ? 1
              : 0
        )
        .map(([key, item]) => [
          key,
          canonicalize(item),
        ])
    );
  }

  return value;
};

// =====================================
// REQUEST FINGERPRINT
// =====================================

export const createRequestFingerprint = (
  method: string,

  path: string,

  body: unknown
): string => {
  const serialized = JSON.stringify({
    method: method.toUpperCase(),

    path,

    body: canonicalize(body ?? null),
  });

  return createHash("sha256")
    .update(serialized)
    .digest("hex");
};

// =====================================
// GENERATE REDIS KEY
// =====================================

const createRedisKey = (
  userId: string,

  operation: IdempotencyOperation,

  idempotencyKey: string
): string => {
  const keyHash = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex");

  return [
    IDEMPOTENCY_CONFIG.prefix,

    IDEMPOTENCY_CONFIG.version,

    userId.toLowerCase(),

    operation,

    keyHash,
  ].join(":");
};

// =====================================
// CHECK REDIS AVAILABILITY
// =====================================

const ensureRedisAvailable = (): void => {
  if (redis.status !== "ready") {
    throw new IdempotencyError(
      "Request protection is temporarily unavailable",
      503
    );
  }
};

// =====================================
// ACQUIRE IDEMPOTENCY LOCK
// =====================================

export const acquireIdempotency = async (
  userId: string,

  operation: IdempotencyOperation,

  idempotencyKey: string,

  fingerprint: string
): Promise<AcquireIdempotencyResult> => {
  validateUserId(userId);

  validateIdempotencyKey(
    idempotencyKey
  );

  ensureRedisAvailable();

  const redisKey = createRedisKey(
    userId,
    operation,
    idempotencyKey
  );

  const token = randomUUID();

  const record: ProcessingRecord = {
    status: "processing",

    fingerprint,

    token,

    createdAt:
      new Date().toISOString(),
  };

  try {
    // SET NX ensures that only one
    // request can acquire this key.

    const acquired = await redis.set(
      redisKey,

      JSON.stringify(record),

      "EX",

      IDEMPOTENCY_CONFIG.processingTTL,

      "NX"
    );

    if (acquired === "OK") {
      return {
        status: "acquired",

        redisKey,

        token,

        fingerprint,
      };
    }

    const existingValue =
      await redis.get(redisKey);

    if (!existingValue) {
      throw new IdempotencyError(
        "Request state changed. Please retry.",
        409
      );
    }

    const existingRecord =
      JSON.parse(
        existingValue
      ) as IdempotencyRecord;

    // The same idempotency key must
    // not be reused for different input.

    if (
      existingRecord.fingerprint !==
      fingerprint
    ) {
      throw new IdempotencyError(
        "Idempotency key was already used for a different request",
        409
      );
    }

    if (
      existingRecord.status ===
      "completed"
    ) {
      return {
        status: "completed",

        statusCode:
          existingRecord.statusCode,

        response:
          existingRecord.response,
      };
    }

    if (
      existingRecord.status ===
      "processing"
    ) {
      return {
        status: "processing",
      };
    }

    throw new IdempotencyError(
      "Invalid saved request state",
      503
    );

  } catch (error) {
    if (
      error instanceof IdempotencyError
    ) {
      throw error;
    }

    throw new IdempotencyError(
      "Unable to acquire request protection",
      503
    );
  }
};

// =====================================
// ATOMIC COMPLETION SCRIPT
// =====================================

const COMPLETE_SCRIPT = `
  local existing = redis.call(
    "GET",
    KEYS[1]
  )

  if not existing then
    return 0
  end

  local record = cjson.decode(existing)

  if record.status ~= "processing" then
    return 0
  end

  if record.token ~= ARGV[1] then
    return 0
  end

  redis.call(
    "SET",
    KEYS[1],
    ARGV[2],
    "EX",
    ARGV[3]
  )

  return 1
`;

// =====================================
// SAVE COMPLETED RESPONSE
// =====================================

export const completeIdempotency =
  async (
    redisKey: string,

    token: string,

    fingerprint: string,

    statusCode: number,

    response: unknown
  ): Promise<boolean> => {
    if (
      statusCode < 200 ||
      statusCode >= 300
    ) {
      return false;
    }

    ensureRedisAvailable();

    const record: CompletedRecord = {
      status: "completed",

      fingerprint,

      statusCode,

      response,

      createdAt:
        new Date().toISOString(),

      completedAt:
        new Date().toISOString(),
    };

    const serialized =
      JSON.stringify(record);

    if (
      Buffer.byteLength(
        serialized,
        "utf8"
      ) >
      IDEMPOTENCY_CONFIG.maxResponseBytes
    ) {
      return false;
    }

    try {
      const result = await redis.eval(
        COMPLETE_SCRIPT,

        1,

        redisKey,

        token,

        serialized,

        String(
          IDEMPOTENCY_CONFIG.completedTTL
        )
      );

      return Number(result) === 1;

    } catch {
      throw new IdempotencyError(
        "Unable to save completed request state",
        503
      );
    }
  };

// =====================================
// ATOMIC RELEASE SCRIPT
// =====================================

const RELEASE_SCRIPT = `
  local existing = redis.call(
    "GET",
    KEYS[1]
  )

  if not existing then
    return 0
  end

  local record = cjson.decode(existing)

  if record.status ~= "processing" then
    return 0
  end

  if record.token ~= ARGV[1] then
    return 0
  end

  return redis.call(
    "DEL",
    KEYS[1]
  )
`;

// =====================================
// RELEASE IDEMPOTENCY LOCK
// =====================================

export const releaseIdempotency =
  async (
    redisKey: string,

    token: string
  ): Promise<boolean> => {
    if (redis.status !== "ready") {
      return false;
    }

    try {
      const result = await redis.eval(
        RELEASE_SCRIPT,

        1,

        redisKey,

        token
      );

      return Number(result) === 1;

    } catch {
      return false;
    }
  };
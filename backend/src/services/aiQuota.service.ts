import redis from "../config/redis.config.js";

import {
  AI_QUOTA_CONFIG,
  getFeatureQuotaLimit,
} from "../config/aiQuota.config.js";

import {
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

import type {
  AIUsageFeature,
} from "../config/aiUsage.config.js";

// =====================================
// QUOTA ERROR
// =====================================

export class AIQuotaError extends Error {

  constructor(
    message: string,
    public statusCode: number,
    public resetAt?: string
  ) {

    super(message);

    this.name = "AIQuotaError";
  }
}

// =====================================
// DAILY QUOTA WINDOW
// =====================================

const getQuotaWindow = () => {

  const now = new Date();

  const date =
    now.toISOString().slice(0, 10);

  const resetAt = new Date(now);

  resetAt.setUTCHours(24, 0, 0, 0);

  const expiresAt =
    Math.floor(resetAt.getTime() / 1000);

  return {
    date,
    resetAt: resetAt.toISOString(),
    expiresAt,
  };
};

// =====================================
// REDIS QUOTA KEY
// =====================================

const getQuotaKey = (
  userId: string,
  date: string
): string => {

  return (
    `${AI_QUOTA_CONFIG.keyPrefix}:` +
    `${userId}:${date}`
  );
};

// =====================================
// ATOMIC QUOTA RESERVATION
// =====================================

const RESERVE_QUOTA_SCRIPT = `
  local key = KEYS[1]

  local feature = ARGV[1]
  local featureLimit = tonumber(ARGV[2])
  local totalLimit = tonumber(ARGV[3])
  local expiresAt = tonumber(ARGV[4])

  local total = tonumber(
    redis.call("HGET", key, "total") or "0"
  )

  local featureCount = tonumber(
    redis.call("HGET", key, feature) or "0"
  )

  if total >= totalLimit then
    return {0, 1, total, featureCount}
  end

  if featureCount >= featureLimit then
    return {0, 2, total, featureCount}
  end

  total = redis.call(
    "HINCRBY", key, "total", 1
  )

  featureCount = redis.call(
    "HINCRBY", key, feature, 1
  )

  redis.call("EXPIREAT", key, expiresAt)

  return {1, 0, total, featureCount}
`;

// =====================================
// RESERVE AI PROVIDER ATTEMPT
// =====================================

export const reserveAIQuota = async (
  userId: string,
  feature: AIUsageFeature =
    AI_USAGE_FEATURES.UNKNOWN
) => {

  const window = getQuotaWindow();

  const featureLimit =
    getFeatureQuotaLimit(feature);

  const totalLimit =
    AI_QUOTA_CONFIG.dailyTotalAttemptLimit;

  if (!AI_QUOTA_CONFIG.enabled) {

    return {
      allowed: true,
      enforced: false,
      resetAt: window.resetAt,
    };
  }

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {

    throw new AIQuotaError(
      "Invalid user identifier",
      400
    );
  }

  if (redis.status !== "ready") {

    throw new AIQuotaError(
      "AI quota service is temporarily unavailable",
      503
    );
  }

  let result: [number, number, number, number];

  try {

    result = await redis.eval(

      RESERVE_QUOTA_SCRIPT,

      1,

      getQuotaKey(userId, window.date),

      feature,

      featureLimit,

      totalLimit,

      window.expiresAt

    ) as [number, number, number, number];

  } catch {

    throw new AIQuotaError(
      "AI quota service is temporarily unavailable",
      503
    );
  }

  const [
    allowed,
    reason,
    totalUsed,
    featureUsed,
  ] = result;

  if (allowed !== 1) {

    throw new AIQuotaError(

      reason === 1

        ? "Daily AI usage limit reached"

        : "Daily feature usage limit reached",

      429,

      window.resetAt
    );
  }

  return {

    allowed: true,

    enforced: true,

    feature,

    totalUsed,

    totalLimit,

    totalRemaining:
      Math.max(0, totalLimit - totalUsed),

    featureUsed,

    featureLimit,

    featureRemaining:
      Math.max(0, featureLimit - featureUsed),

    resetAt: window.resetAt,
  };
};

// =====================================
// RETRIEVE USER QUOTA STATUS
// =====================================

export const getUserAIQuota = async (
  userId: string
) => {

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {

    throw new AIQuotaError(
      "Invalid user identifier",
      400
    );
  }

  const window = getQuotaWindow();

  if (redis.status !== "ready") {

    throw new AIQuotaError(
      "AI quota service is temporarily unavailable",
      503
    );
  }

  let counters: Record<string, string>;

  try {

    counters = await redis.hgetall(
      getQuotaKey(userId, window.date)
    );

  } catch {

    throw new AIQuotaError(
      "Unable to retrieve AI quota",
      503
    );
  }

  const totalUsed =
    Number(counters.total ?? 0);

  const totalLimit =
    AI_QUOTA_CONFIG.dailyTotalAttemptLimit;

  const features =
    Object.values(AI_USAGE_FEATURES).map(
      (feature) => {

        const used =
          Number(counters[feature] ?? 0);

        const limit =
          getFeatureQuotaLimit(feature);

        return {

          feature,

          used,

          limit,

          remaining:
            Math.max(0, limit - used),

          exhausted: used >= limit,
        };
      }
    );

  return {

    enabled: AI_QUOTA_CONFIG.enabled,

    userId,

    total: {

      used: totalUsed,

      limit: totalLimit,

      remaining:
        Math.max(0, totalLimit - totalUsed),

      exhausted:
        totalUsed >= totalLimit,
    },

    features,

    resetAt: window.resetAt,

    timezone: AI_QUOTA_CONFIG.timezone,
  };
};
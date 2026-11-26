import { Types } from "mongoose";

import AIUsage from "../models/aiUsage.model.js";

import {
  AI_USAGE_CONFIG,
} from "../config/aiUsage.config.js";

import {
  getAnalyticsDateRange,
} from "../utils/adminAnalytics.utils.js";

interface UsageFilters {
  days: number;
  provider?: "groq" | "gemini";
  userId?: string;
}

interface UsageMatch {
  createdAt: {
    $gte: Date;
    $lte: Date;
  };
  provider?: "groq" | "gemini";
  userId?: Types.ObjectId;
}

// =====================================
// COMMON AGGREGATION METRICS
// =====================================

const usageMetrics = {

  totalAttempts: {
    $sum: 1,
  },

  successfulAttempts: {
    $sum: {
      $cond: [
        { $eq: ["$outcome", "success"] },
        1,
        0,
      ],
    },
  },

  failedAttempts: {
    $sum: {
      $cond: [
        { $eq: ["$outcome", "failure"] },
        1,
        0,
      ],
    },
  },

  fallbackAttempts: {
    $sum: {
      $cond: [
        { $eq: ["$isFallback", true] },
        1,
        0,
      ],
    },
  },

  inputTokens: {
    $sum: {
      $ifNull: ["$inputTokens", 0],
    },
  },

  outputTokens: {
    $sum: {
      $ifNull: ["$outputTokens", 0],
    },
  },

  totalTokens: {
    $sum: {
      $ifNull: ["$totalTokens", 0],
    },
  },

  measuredAttempts: {
    $sum: {
      $cond: [
        { $isNumber: "$totalTokens" },
        1,
        0,
      ],
    },
  },

  pricedAttempts: {
    $sum: {
      $cond: [
        { $isNumber: "$estimatedCostUsd" },
        1,
        0,
      ],
    },
  },

  estimatedCostUsd: {
    $sum: {
      $ifNull: ["$estimatedCostUsd", 0],
    },
  },

  averageDurationMs: {
    $avg: "$durationMs",
  },
};

// =====================================
// AGGREGATION RESULT TYPES
// =====================================

interface UsageMetrics {

  totalAttempts: number;

  successfulAttempts: number;

  failedAttempts: number;

  fallbackAttempts: number;

  inputTokens: number;

  outputTokens: number;

  totalTokens: number;

  measuredAttempts: number;

  pricedAttempts: number;

  estimatedCostUsd: number;

  averageDurationMs: number | null;
}

interface UsageBucket extends UsageMetrics {
  _id: string | null;
}

interface ModelUsageBucket extends UsageMetrics {
  _id: {
    provider: string;
    model: string;
  };
}

interface UsageAggregation {

  summary: UsageBucket[];

  providers: UsageBucket[];

  models: ModelUsageBucket[];

  features: UsageBucket[];

  trend: UsageBucket[];
}

// =====================================
// DEFAULT METRICS
// =====================================

const emptyMetrics = (): UsageMetrics => ({

  totalAttempts: 0,

  successfulAttempts: 0,

  failedAttempts: 0,

  fallbackAttempts: 0,

  inputTokens: 0,

  outputTokens: 0,

  totalTokens: 0,

  measuredAttempts: 0,

  pricedAttempts: 0,

  estimatedCostUsd: 0,

  averageDurationMs: null,
});

// =====================================
// FORMAT ANALYTICS METRICS
// =====================================

const formatMetrics = (
  metrics: UsageMetrics
) => {

  const total =
    metrics.totalAttempts;

  return {

    totalAttempts: total,

    successfulAttempts:
      metrics.successfulAttempts,

    failedAttempts:
      metrics.failedAttempts,

    fallbackAttempts:
      metrics.fallbackAttempts,

    inputTokens:
      metrics.inputTokens,

    outputTokens:
      metrics.outputTokens,

    totalTokens:
      metrics.measuredAttempts > 0
        ? metrics.totalTokens
        : null,

    measuredAttempts:
      metrics.measuredAttempts,

    unmeasuredAttempts:
      total - metrics.measuredAttempts,

    pricedAttempts:
      metrics.pricedAttempts,

    unpricedAttempts:
      total - metrics.pricedAttempts,

    estimatedCostUsd:
      metrics.pricedAttempts > 0
        ? Number(
            metrics.estimatedCostUsd.toFixed(10)
          )
        : null,

    averageDurationMs:
      metrics.averageDurationMs !== null
        ? Math.round(
            metrics.averageDurationMs
          )
        : null,

    successRate:
      total > 0
        ? Number(
            (
              metrics.successfulAttempts /
              total * 100
            ).toFixed(2)
          )
        : null,

    tokenMeasurementCoverage:
      total > 0
        ? Number(
            (
              metrics.measuredAttempts /
              total * 100
            ).toFixed(2)
          )
        : null,

    pricingCoverage:
      total > 0
        ? Number(
            (
              metrics.pricedAttempts /
              total * 100
            ).toFixed(2)
          )
        : null,
  };
};

// =====================================
// RETRIEVE AI USAGE ANALYTICS
// =====================================

export const getAdminAIUsage = async (
  filters: UsageFilters
) => {

  const range =
    getAnalyticsDateRange(filters.days);

  const match: UsageMatch = {

    createdAt: {
      $gte: range.startDate,
      $lte: range.endDate,
    },
  };

  if (filters.provider) {
    match.provider = filters.provider;
  }

  if (filters.userId) {
    match.userId =
      new Types.ObjectId(filters.userId);
  }

  const results =
    await AIUsage.aggregate<UsageAggregation>([

      {
        $match: match,
      },

      {
        $facet: {

          summary: [
            {
              $group: {
                _id: null,
                ...usageMetrics,
              },
            },
          ],

          providers: [
            {
              $group: {
                _id: "$provider",
                ...usageMetrics,
              },
            },
            {
              $sort: {
                totalAttempts: -1,
              },
            },
          ],

          models: [
            {
              $group: {
                _id: {
                  provider: "$provider",
                  model: "$model",
                },
                ...usageMetrics,
              },
            },
            {
              $sort: {
                totalAttempts: -1,
              },
            },
            {
              $limit: 50,
            },
          ],

          features: [
            {
              $group: {
                _id: "$feature",
                ...usageMetrics,
              },
            },
            {
              $sort: {
                totalAttempts: -1,
              },
            },
            {
              $limit: 50,
            },
          ],

          trend: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                    timezone: "UTC",
                  },
                },
                ...usageMetrics,
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
        },
      },
    ])

      .option({
        maxTimeMS:
          AI_USAGE_CONFIG.analytics.queryTimeoutMs,
      })

      .exec();

  const result = results[0];

  const summary =
    result?.summary[0] ??
    emptyMetrics();

  return {

    summary: formatMetrics(summary),

    providers:
      (result?.providers ?? []).map(
        (item) => ({
          provider: item._id,
          ...formatMetrics(item),
        })
      ),

    models:
      (result?.models ?? []).map(
        (item) => ({
          provider: item._id.provider,
          model: item._id.model,
          ...formatMetrics(item),
        })
      ),

    features:
      (result?.features ?? []).map(
        (item) => ({
          feature: item._id,
          ...formatMetrics(item),
        })
      ),

    trend:
      (result?.trend ?? []).map(
        (item) => ({
          date: item._id,
          ...formatMetrics(item),
        })
      ),

    filters: {
      days: filters.days,
      provider: filters.provider ?? null,
      userId: filters.userId ?? null,
    },

    dateRange: {
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: "UTC",
    },

    retentionDays:
      AI_USAGE_CONFIG.retentionDays,

    currency: "USD",

    generatedAt:
      new Date().toISOString(),
  };
};
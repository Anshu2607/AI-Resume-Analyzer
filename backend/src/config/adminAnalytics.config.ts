// =====================================
// ADMIN ANALYTICS CONFIGURATION
// =====================================

export const ADMIN_ANALYTICS_CONFIG = {

  defaultRangeDays: 30,

  maxRangeDays: 90,

  defaultTimezone: "UTC",

  millisecondsPerDay:
    24 * 60 * 60 * 1000,

  maxFeatureResults: 20,

  aggregationTimeoutMs: 10000,

  cache: {

    enabled: true,

    ttlSeconds: 60,

    prefix:
      "admin:analytics",

  },

} as const;

// =====================================
// SUPPORTED ANALYTICS PERIODS
// =====================================

export const ANALYTICS_PERIODS = {

  DAILY: "daily",

  WEEKLY: "weekly",

  MONTHLY: "monthly",

} as const;

export type AnalyticsPeriod =
  typeof ANALYTICS_PERIODS[
    keyof typeof ANALYTICS_PERIODS
  ];

// =====================================
// SUPPORTED DATE RANGES
// =====================================

export const ANALYTICS_RANGES = [

  7,

  14,

  30,

  60,

  90,

] as const;

export type AnalyticsRange =
  typeof ANALYTICS_RANGES[number];
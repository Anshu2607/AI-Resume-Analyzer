import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import {
  ADMIN_ANALYTICS_CONFIG,
  ANALYTICS_PERIODS,
} from "../config/adminAnalytics.config.js";

import type {
  AnalyticsPeriod,
} from "../config/adminAnalytics.config.js";

import {
  getAnalyticsDateRange,
  getDateGroupingExpression,
  fillMissingPeriods,
  formatAnalyticsDate,
  calculatePercentage,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// PERFORMANCE AGGREGATION INTERFACES
// =====================================

interface PerformanceMetrics {

  totalRequests: number;

  successfulRequests: number;

  failedRequests: number;

  clientErrors: number;

  serverErrors: number;

  rateLimitedRequests: number;

  averageDurationMs: number | null;

  minimumDurationMs: number | null;

  maximumDurationMs: number | null;

}

interface PerformanceTrend
  extends PerformanceMetrics {

  date: Date;

}

interface StatusCodeAggregation {

  _id: number;

  count: number;

}

interface PerformanceAggregation {

  summary: PerformanceMetrics[];

  trend: PerformanceTrend[];

  statusCodes: StatusCodeAggregation[];

}

// =====================================
// SHARED AGGREGATION METRICS
// =====================================

const performanceMetrics = {

  totalRequests: {
    $sum: 1,
  },

  successfulRequests: {
    $sum: {

      $cond: [
        {
          $eq: [
            "$outcome",
            ACTIVITY_OUTCOMES.SUCCESS,
          ],
        },
        1,
        0,
      ],

    },
  },

  failedRequests: {
    $sum: {

      $cond: [
        {
          $eq: [
            "$outcome",
            ACTIVITY_OUTCOMES.FAILURE,
          ],
        },
        1,
        0,
      ],

    },
  },

  clientErrors: {
    $sum: {

      $cond: [
        {
          $and: [
            {
              $gte: ["$statusCode", 400],
            },
            {
              $lt: ["$statusCode", 500],
            },
          ],
        },
        1,
        0,
      ],

    },
  },

  serverErrors: {
    $sum: {

      $cond: [
        {
          $and: [
            {
              $gte: ["$statusCode", 500],
            },
            {
              $lt: ["$statusCode", 600],
            },
          ],
        },
        1,
        0,
      ],

    },
  },

  rateLimitedRequests: {
    $sum: {

      $cond: [
        {
          $eq: ["$statusCode", 429],
        },
        1,
        0,
      ],

    },
  },

  averageDurationMs: {
    $avg: "$durationMs",
  },

  minimumDurationMs: {
    $min: "$durationMs",
  },

  maximumDurationMs: {
    $max: "$durationMs",
  },

};

// =====================================
// EMPTY PERFORMANCE METRICS
// =====================================

const getEmptyMetrics =
  (): PerformanceMetrics => ({

    totalRequests: 0,

    successfulRequests: 0,

    failedRequests: 0,

    clientErrors: 0,

    serverErrors: 0,

    rateLimitedRequests: 0,

    averageDurationMs: null,

    minimumDurationMs: null,

    maximumDurationMs: null,

  });

// =====================================
// NORMALIZE PERFORMANCE METRICS
// =====================================

const normalizeMetrics = (

  metrics: PerformanceMetrics

) => ({

  totalRequests:
    metrics.totalRequests,

  successfulRequests:
    metrics.successfulRequests,

  failedRequests:
    metrics.failedRequests,

  clientErrors:
    metrics.clientErrors,

  serverErrors:
    metrics.serverErrors,

  rateLimitedRequests:
    metrics.rateLimitedRequests,

  averageDurationMs:

    metrics.averageDurationMs != null

      ? roundAnalyticsMetric(
          metrics.averageDurationMs
        )

      : null,

  minimumDurationMs:

    metrics.minimumDurationMs != null

      ? roundAnalyticsMetric(
          metrics.minimumDurationMs
        )

      : null,

  maximumDurationMs:

    metrics.maximumDurationMs != null

      ? roundAnalyticsMetric(
          metrics.maximumDurationMs
        )

      : null,

  successRate:

    metrics.totalRequests > 0

      ? calculatePercentage(
          metrics.successfulRequests,
          metrics.totalRequests
        )

      : null,

  failureRate:

    metrics.totalRequests > 0

      ? calculatePercentage(
          metrics.failedRequests,
          metrics.totalRequests
        )

      : null,

});

// =====================================
// API PERFORMANCE ANALYTICS
// =====================================

export const getPerformanceAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  period: AnalyticsPeriod =
    ANALYTICS_PERIODS.DAILY

) => {

  const range =
    getAnalyticsDateRange(days);

  const results =
    await UserActivity.aggregate<PerformanceAggregation>([

      {
        $match: {

          createdAt: {

            $gte: range.startDate,

            $lt: range.endDate,

          },

          // Only measured HTTP responses.
          // Exclude background worker events.

          statusCode: {

            $gte: 100,

            $lte: 599,

          },

          durationMs: {
            $gte: 0,
          },

        },
      },

      {
        $lookup: {

          from: User.collection.name,

          localField: "userId",

          foreignField: "_id",

          as: "account",

        },
      },

      {
        $match: {

          "account.role": "user",

        },
      },

      // Generate multiple reports from
      // the same matched activity records.

      {
        $facet: {

          summary: [

            {
              $group: {

                _id: null,

                ...performanceMetrics,

              },
            },

          ],

          trend: [

            {
              $group: {

                _id: getDateGroupingExpression(
                  "createdAt",
                  period
                ),

                ...performanceMetrics,

              },
            },

            {
              $set: {
                date: "$_id",
              },
            },

            {
              $unset: "_id",
            },

            {
              $sort: {
                date: 1,
              },
            },

          ],

          statusCodes: [

            {
              $group: {

                _id: "$statusCode",

                count: {
                  $sum: 1,
                },

              },
            },

            {
              $sort: {
                count: -1,
                _id: 1,
              },
            },

          ],

        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec();

  const result = results[0];

  // ===================================
  // NORMALIZE SUMMARY
  // ===================================

  const summary = normalizeMetrics(

    result?.summary[0] ??
      getEmptyMetrics()

  );

  // ===================================
  // NORMALIZE PERFORMANCE TREND
  // ===================================

  const rawTrend =
    result?.trend ?? [];

  const trendMap = new Map(

    rawTrend.map((item) => [

      formatAnalyticsDate(
        new Date(item.date)
      ),

      item,

    ])

  );

  const datePoints = fillMissingPeriods(

    [],

    range,

    period

  );

  const trend = datePoints.map(

    (point) => ({

      date: point.date,

      ...normalizeMetrics(

        trendMap.get(point.date) ??
          getEmptyMetrics()

      ),

    })

  );

  // ===================================
  // HTTP STATUS CODE DISTRIBUTION
  // ===================================

  const statusCodes =

    (result?.statusCodes ?? [])

      .map((item) => ({

        statusCode: item._id,

        count: item.count,

        percentage:
          calculatePercentage(
            item.count,
            summary.totalRequests
          ),

      }));

  // ===================================
  // RETURN PERFORMANCE ANALYTICS
  // ===================================

  return {

    summary,

    trend,

    statusCodes,

    dateRange: {

      days: range.days,

      period,

      startDate:
        range.startDate.toISOString(),

      endDate:
        range.endDate.toISOString(),

      timezone:
        ADMIN_ANALYTICS_CONFIG.defaultTimezone,

    },

    generatedAt:
      new Date().toISOString(),

  };

};
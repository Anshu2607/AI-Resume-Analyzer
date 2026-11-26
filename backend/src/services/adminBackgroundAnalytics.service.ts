import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  ACTIVITY_TYPES,
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
// AGGREGATION INTERFACES
// =====================================

interface BackgroundActivitySummary {

  _id: string;

  count: number;

  averageDurationMs: number | null;

  maximumDurationMs: number | null;

}

interface BackgroundTrendRecord {

  date: Date;

  activityType: string;

  count: number;

}

interface BackgroundAggregation {

  summary: BackgroundActivitySummary[];

  trend: BackgroundTrendRecord[];

}

// =====================================
// BACKGROUND JOB ANALYTICS
// =====================================

export const getBackgroundAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  period: AnalyticsPeriod =
    ANALYTICS_PERIODS.DAILY

) => {

  const range =
    getAnalyticsDateRange(days);

  // ===================================
  // EXECUTE ACTIVITY AGGREGATION
  // ===================================

  const results =
    await UserActivity.aggregate<BackgroundAggregation>([

      {
        $match: {

          createdAt: {

            $gte: range.startDate,

            $lt: range.endDate,

          },

          $or: [

            {

              activityType:
                ACTIVITY_TYPES.BACKGROUND_JOB_SUBMITTED,

              outcome:
                ACTIVITY_OUTCOMES.SUCCESS,

            },

            {

              activityType:
                ACTIVITY_TYPES.BACKGROUND_JOB_COMPLETED,

              outcome:
                ACTIVITY_OUTCOMES.SUCCESS,

            },

            {

              activityType:
                ACTIVITY_TYPES.BACKGROUND_JOB_FAILED,

              outcome:
                ACTIVITY_OUTCOMES.FAILURE,

            },

          ],

        },
      },

      // Exclude administrators and
      // deleted regular accounts.

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

      {
        $facet: {

          // Aggregate overall outcomes.

          summary: [

            {
              $group: {

                _id: "$activityType",

                count: {
                  $sum: 1,
                },

                averageDurationMs: {
                  $avg: "$durationMs",
                },

                maximumDurationMs: {
                  $max: "$durationMs",
                },

              },
            },

          ],

          // Aggregate historical trends.

          trend: [

            {
              $group: {

                _id: {

                  date: getDateGroupingExpression(

                    "createdAt",

                    period

                  ),

                  activityType:
                    "$activityType",

                },

                count: {
                  $sum: 1,
                },

              },
            },

            {
              $project: {

                _id: 0,

                date: "$_id.date",

                activityType:
                  "$_id.activityType",

                count: 1,

              },
            },

            {
              $sort: {

                date: 1,

                activityType: 1,

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

  const summaryMap = new Map(

    (result?.summary ?? []).map((item) => [

      item._id,

      item,

    ])

  );

  const submitted = summaryMap.get(

    ACTIVITY_TYPES.BACKGROUND_JOB_SUBMITTED

  );

  const completed = summaryMap.get(

    ACTIVITY_TYPES.BACKGROUND_JOB_COMPLETED

  );

  const failed = summaryMap.get(

    ACTIVITY_TYPES.BACKGROUND_JOB_FAILED

  );

  const submittedJobs =
    submitted?.count ?? 0;

  const completedJobs =
    completed?.count ?? 0;

  const failedJobs =
    failed?.count ?? 0;

  const totalOutcomeEvents =

    completedJobs +

    failedJobs;

  // ===================================
  // NORMALIZE HISTORICAL TRENDS
  // ===================================

  const trendMap = new Map<string, number>();

  for (const record of result?.trend ?? []) {

    const date = formatAnalyticsDate(

      new Date(record.date)

    );

    const key =
      `${date}:${record.activityType}`;

    trendMap.set(

      key,

      record.count

    );

  }

  const datePoints = fillMissingPeriods(

    [],

    range,

    period

  );

  const trend = datePoints.map((item) => ({

    date: item.date,

    submitted:

      trendMap.get(

        `${item.date}:${ACTIVITY_TYPES.BACKGROUND_JOB_SUBMITTED}`

      ) ?? 0,

    completed:

      trendMap.get(

        `${item.date}:${ACTIVITY_TYPES.BACKGROUND_JOB_COMPLETED}`

      ) ?? 0,

    failed:

      trendMap.get(

        `${item.date}:${ACTIVITY_TYPES.BACKGROUND_JOB_FAILED}`

      ) ?? 0,

  }));

  // ===================================
  // RETURN BACKGROUND ANALYTICS
  // ===================================

  return {

    summary: {

      submittedJobs,

      completedJobs,

      failedJobs,

      totalOutcomeEvents,

      successRate:

        totalOutcomeEvents > 0

          ? calculatePercentage(

              completedJobs,

              totalOutcomeEvents

            )

          : null,

      failureRate:

        totalOutcomeEvents > 0

          ? calculatePercentage(

              failedJobs,

              totalOutcomeEvents

            )

          : null,

      averageSubmissionDurationMs:

        submitted?.averageDurationMs != null

          ? roundAnalyticsMetric(
              submitted.averageDurationMs
            )

          : null,

      averageProcessingDurationMs:

        completed?.averageDurationMs != null

          ? roundAnalyticsMetric(
              completed.averageDurationMs
            )

          : null,

      maximumProcessingDurationMs:

        completed?.maximumDurationMs != null

          ? roundAnalyticsMetric(
              completed.maximumDurationMs
            )

          : null,

    },

    trend,

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
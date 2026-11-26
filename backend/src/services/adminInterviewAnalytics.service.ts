import User from "../models/user.model.js";

import InterviewSession from "../models/interviewSession.model.js";

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
  calculatePercentage,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// AGGREGATION INTERFACES
// =====================================

interface InterviewSummary {

  totalInterviews: number;

  completedInterviews: number;

  inProgressInterviews: number;

  cancelledInterviews: number;

  totalAnswers: number;

  totalSkippedQuestions: number;

  averageScore: number | null;

}

interface InterviewTrend {

  date: Date;

  count: number;

}

interface ReportRequestSummary {

  totalRequests: number;

  successfulRequests: number;

  failedRequests: number;

}

// =====================================
// INTERVIEW ANALYTICS
// =====================================

export const getInterviewAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  period: AnalyticsPeriod =
    ANALYTICS_PERIODS.DAILY

) => {

  const range =
    getAnalyticsDateRange(days);

  const dateFilter = {

    $gte: range.startDate,

    $lt: range.endDate,

  };

  // ===================================
  // EXECUTE ANALYTICS QUERIES
  // ===================================

  const [

    interviewRecords,

    startedRecords,

    completedRecords,

    reportRecords,

  ] = await Promise.all([

    // Interview session summary.

    InterviewSession.aggregate<InterviewSummary>([

      {
        $match: {

          createdAt: dateFilter,

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

      {
        $group: {

          _id: null,

          totalInterviews: {
            $sum: 1,
          },

          completedInterviews: {

            $sum: {

              $cond: [

                {
                  $eq: [
                    "$status",
                    "completed",
                  ],
                },

                1,

                0,

              ],

            },

          },

          inProgressInterviews: {

            $sum: {

              $cond: [

                {
                  $eq: [
                    "$status",
                    "in_progress",
                  ],
                },

                1,

                0,

              ],

            },

          },

          cancelledInterviews: {

            $sum: {

              $cond: [

                {
                  $eq: [
                    "$status",
                    "cancelled",
                  ],
                },

                1,

                0,

              ],

            },

          },

          totalAnswers: {
            $sum: "$answeredQuestions",
          },

          totalSkippedQuestions: {
            $sum: "$skippedQuestions",
          },

          averageScore: {

            $avg: {

              $cond: [

                {
                  $eq: [
                    "$status",
                    "completed",
                  ],
                },

                "$averageScore",

                null,

              ],

            },

          },

        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec(),

    // Interview creation trend.

    InterviewSession.aggregate<InterviewTrend>([

      {
        $match: {

          createdAt: dateFilter,

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

      {
        $group: {

          _id: getDateGroupingExpression(
            "createdAt",
            period
          ),

          count: {
            $sum: 1,
          },

        },
      },

      {
        $project: {

          _id: 0,

          date: "$_id",

          count: 1,

        },
      },

      {
        $sort: {
          date: 1,
        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec(),

    // Actual interview completion trend.

    InterviewSession.aggregate<InterviewTrend>([

      {
        $match: {

          status: "completed",

          completedAt: dateFilter,

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

      {
        $group: {

          _id: getDateGroupingExpression(
            "completedAt",
            period
          ),

          count: {
            $sum: 1,
          },

        },
      },

      {
        $project: {

          _id: 0,

          date: "$_id",

          count: 1,

        },
      },

      {
        $sort: {
          date: 1,
        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec(),

    // Interview report request analytics.

    UserActivity.aggregate<ReportRequestSummary>([

      {
        $match: {

          activityType:
            ACTIVITY_TYPES.INTERVIEW_REPORT_GENERATED,

          createdAt: dateFilter,

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

      {
        $group: {

          _id: null,

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

        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec(),

  ]);

  // ===================================
  // NORMALIZE SUMMARY
  // ===================================

  const summary = interviewRecords[0] ?? {

    totalInterviews: 0,

    completedInterviews: 0,

    inProgressInterviews: 0,

    cancelledInterviews: 0,

    totalAnswers: 0,

    totalSkippedQuestions: 0,

    averageScore: null,

  };

  const reportSummary = reportRecords[0] ?? {

    totalRequests: 0,

    successfulRequests: 0,

    failedRequests: 0,

  };

  // ===================================
  // NORMALIZE INTERVIEW TRENDS
  // ===================================

  const startedTrend = fillMissingPeriods(

    startedRecords,

    range,

    period

  );

  const completedTrend = fillMissingPeriods(

    completedRecords,

    range,

    period

  );

  const completedMap = new Map(

    completedTrend.map((item) => [

      item.date,

      item.count,

    ])

  );

  const trend = startedTrend.map((item) => ({

    date: item.date,

    started: item.count,

    completed:
      completedMap.get(item.date) ?? 0,

  }));

  // ===================================
  // CALCULATE INTERVIEW METRICS
  // ===================================

  const totalProcessedQuestions =

    summary.totalAnswers +

    summary.totalSkippedQuestions;

  // ===================================
  // RETURN ANALYTICS
  // ===================================

  return {

    summary: {

      totalInterviews:
        summary.totalInterviews,

      completedInterviews:
        summary.completedInterviews,

      inProgressInterviews:
        summary.inProgressInterviews,

      cancelledInterviews:
        summary.cancelledInterviews,

      completionRate:

        summary.totalInterviews > 0

          ? calculatePercentage(

              summary.completedInterviews,

              summary.totalInterviews

            )

          : null,

      totalAnswers:
        summary.totalAnswers,

      totalSkippedQuestions:
        summary.totalSkippedQuestions,

      answerRate:

        totalProcessedQuestions > 0

          ? calculatePercentage(

              summary.totalAnswers,

              totalProcessedQuestions

            )

          : null,

      averageScore:

        summary.averageScore != null

          ? roundAnalyticsMetric(
              summary.averageScore
            )

          : null,

      completedDuringRange:

        completedTrend.reduce(

          (total, item) =>
            total + item.count,

          0

        ),

    },

    reports: {

      ...reportSummary,

      successRate:

        reportSummary.totalRequests > 0

          ? calculatePercentage(

              reportSummary.successfulRequests,

              reportSummary.totalRequests

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
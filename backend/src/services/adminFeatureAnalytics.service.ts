import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import {
  ADMIN_ANALYTICS_CONFIG,
} from "../config/adminAnalytics.config.js";

import {
  getAnalyticsDateRange,
  calculatePercentage,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// TRACKED FEATURE LABELS
// =====================================

const FEATURE_LABELS: Record<string, string> = {

  [ACTIVITY_TYPES.RESUME_UPLOADED]:
    "Resume Upload",

  [ACTIVITY_TYPES.RESUME_DELETED]:
    "Resume Deletion",

  [ACTIVITY_TYPES.RESUME_ANALYZED]:
    "AI Resume Analysis",

  [ACTIVITY_TYPES.VECTOR_SEARCH]:
    "Semantic Search",

  [ACTIVITY_TYPES.RAG_CONVERSATION]:
    "RAG Assistant",

  [ACTIVITY_TYPES.JOB_MATCHING]:
    "Job Matching",

  [ACTIVITY_TYPES.SKILL_GAP_ANALYSIS]:
    "Skill Gap Analysis",

  [ACTIVITY_TYPES.CAREER_ROADMAP]:
    "Career Roadmap",

  [ACTIVITY_TYPES.AGENT_EXECUTION]:
    "Agentic AI",

  [ACTIVITY_TYPES.INTERVIEW_STARTED]:
    "Interview Preparation",

  [ACTIVITY_TYPES.INTERVIEW_ANSWER_SUBMITTED]:
    "Interview Answer Submission",

  [ACTIVITY_TYPES.INTERVIEW_REPORT_GENERATED]:
    "Interview Report Requests",

  [ACTIVITY_TYPES.BACKGROUND_JOB_SUBMITTED]:
    "Background Job Submission",

};

// =====================================
// AGGREGATION INTERFACE
// =====================================

interface FeatureAggregation {

  _id: string;

  totalRequests: number;

  successfulRequests: number;

  failedRequests: number;

  uniqueUsers: number;

  averageDurationMs: number | null;

}

// =====================================
// FEATURE USAGE ANALYTICS
// =====================================

export const getFeatureAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays

) => {

  const range =
    getAnalyticsDateRange(days);

  const records =
    await UserActivity.aggregate<FeatureAggregation>([

      {
        $match: {

          activityType: {
            $in: Object.keys(FEATURE_LABELS),
          },

          createdAt: {
            $gte: range.startDate,
            $lt: range.endDate,
          },

        },
      },

      // Exclude administrator and deleted accounts.

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

      // Group requests by feature and user.

      {
        $group: {

          _id: {

            activityType: "$activityType",

            userId: "$userId",

          },

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

          totalDurationMs: {
            $sum: "$durationMs",
          },

          measuredRequests: {
            $sum: {
              $cond: [
                {
                  $isNumber: "$durationMs",
                },
                1,
                0,
              ],
            },
          },

        },
      },

      // Calculate feature-level totals.

      {
        $group: {

          _id: "$_id.activityType",

          totalRequests: {
            $sum: "$totalRequests",
          },

          successfulRequests: {
            $sum: "$successfulRequests",
          },

          failedRequests: {
            $sum: "$failedRequests",
          },

          uniqueUsers: {
            $sum: 1,
          },

          totalDurationMs: {
            $sum: "$totalDurationMs",
          },

          measuredRequests: {
            $sum: "$measuredRequests",
          },

        },
      },

      {
        $project: {

          totalRequests: 1,

          successfulRequests: 1,

          failedRequests: 1,

          uniqueUsers: 1,

          averageDurationMs: {

            $cond: [

              {
                $gt: [
                  "$measuredRequests",
                  0,
                ],
              },

              {
                $divide: [
                  "$totalDurationMs",
                  "$measuredRequests",
                ],
              },

              null,

            ],

          },

        },
      },

      {
        $sort: {
          totalRequests: -1,
          _id: 1,
        },
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

        allowDiskUse: true,

      })

      .exec();

  // ===================================
  // NORMALIZE FEATURE RESULTS
  // ===================================

  const recordMap = new Map(

    records.map((record) => [
      record._id,
      record,
    ])

  );

  const features = Object.entries(

    FEATURE_LABELS

  ).map(([activityType, label]) => {

    const record =
      recordMap.get(activityType);

    const totalRequests =
      record?.totalRequests ?? 0;

    const successfulRequests =
      record?.successfulRequests ?? 0;

    const failedRequests =
      record?.failedRequests ?? 0;

    return {

      activityType,

      label,

      totalRequests,

      successfulRequests,

      failedRequests,

      uniqueUsers:
        record?.uniqueUsers ?? 0,

      successRate:

        totalRequests > 0

          ? calculatePercentage(
              successfulRequests,
              totalRequests
            )

          : null,

      averageDurationMs:

        record?.averageDurationMs != null

          ? roundAnalyticsMetric(
              record.averageDurationMs
            )

          : null,

    };

  }).sort(

    (a, b) =>
      b.totalRequests - a.totalRequests ||
      a.label.localeCompare(b.label)

  );

  // ===================================
  // CALCULATE FEATURE SUMMARY
  // ===================================

  const totalRequests =
    features.reduce(
      (total, feature) =>
        total + feature.totalRequests,
      0
    );

  const successfulRequests =
    features.reduce(
      (total, feature) =>
        total + feature.successfulRequests,
      0
    );

  const failedRequests =
    features.reduce(
      (total, feature) =>
        total + feature.failedRequests,
      0
    );

  const mostUsedFeature =

    totalRequests > 0

      ? features[0]

      : null;

  return {

    summary: {

      totalRequests,

      successfulRequests,

      failedRequests,

      successRate:

        totalRequests > 0

          ? calculatePercentage(
              successfulRequests,
              totalRequests
            )

          : null,

      mostUsedFeature,

    },

    features: features.map((feature) => ({

      ...feature,

      usagePercentage:
        calculatePercentage(
          feature.totalRequests,
          totalRequests
        ),

    })).slice(

      0,

      ADMIN_ANALYTICS_CONFIG.maxFeatureResults

    ),

    dateRange: {

      days: range.days,

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
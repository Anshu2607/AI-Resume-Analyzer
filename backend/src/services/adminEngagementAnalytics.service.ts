import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  ADMIN_ANALYTICS_CONFIG,
  ANALYTICS_PERIODS,
} from "../config/adminAnalytics.config.js";

import type {
  AnalyticsPeriod,
} from "../config/adminAnalytics.config.js";

import {
  ACTIVITY_OUTCOMES,
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  getAnalyticsDateRange,
  getDateGroupingExpression,
  fillMissingPeriods,
  calculatePercentage,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// ENGAGEMENT AGGREGATION INTERFACES
// =====================================

interface EngagementAggregation {

  date: Date;

  count: number;

}

interface UniqueUserAggregation {

  count: number;

}

// =====================================
// USER ENGAGEMENT ANALYTICS
// =====================================

export const getEngagementAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  period: AnalyticsPeriod =
    ANALYTICS_PERIODS.DAILY

) => {

  const now = new Date();

  const range =
    getAnalyticsDateRange(days, now);

  // ===================================
  // ACTIVITY FILTER
  // ===================================

  const activityFilter = {

    createdAt: {

      $gte: range.startDate,

      $lt: range.endDate,

    },

    outcome:
      ACTIVITY_OUTCOMES.SUCCESS,

    // Background completion events are
    // not direct user interactions.

    activityType: {

      $nin: [

        ACTIVITY_TYPES.BACKGROUND_JOB_COMPLETED,

        ACTIVITY_TYPES.BACKGROUND_JOB_FAILED,

      ],

    },

  };

  // ===================================
  // EXECUTE ENGAGEMENT QUERIES
  // ===================================

  const [

    engagementRecords,

    uniqueUserRecords,

    totalUsers,

  ] = await Promise.all([

    // Count distinct users in each period.

    UserActivity.aggregate<EngagementAggregation>([

      {
        $match: activityFilter,
      },

      {
        $group: {

          _id: {

            date: getDateGroupingExpression(

              "createdAt",

              period

            ),

            userId: "$userId",

          },

        },
      },

      {
        $lookup: {

          from: User.collection.name,

          localField: "_id.userId",

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

          _id: "$_id.date",

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

    // Count unique engaged users across
    // the entire selected date range.

    UserActivity.aggregate<UniqueUserAggregation>([

      {
        $match: activityFilter,
      },

      {
        $group: {
          _id: "$userId",
        },
      },

      {
        $lookup: {

          from: User.collection.name,

          localField: "_id",

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
        $count: "count",
      },

    ])

      .option({

        maxTimeMS:
          ADMIN_ANALYTICS_CONFIG
            .aggregationTimeoutMs,

      })

      .exec(),

    // Count all existing regular accounts.

    User.countDocuments({

      role: "user",

    })

      .maxTimeMS(

        ADMIN_ANALYTICS_CONFIG
          .aggregationTimeoutMs

      )

      .exec(),

  ]);

  // ===================================
  // NORMALIZE ENGAGEMENT TREND
  // ===================================

  const trend = fillMissingPeriods(

    engagementRecords,

    range,

    period

  );

  // ===================================
  // CALCULATE ENGAGEMENT METRICS
  // ===================================

  const uniqueEngagedUsers =

    uniqueUserRecords[0]?.count ?? 0;

  const totalPeriodEngagements =
    trend.reduce(

      (total, point) =>
        total + point.count,

      0

    );

  const averageEngagedUsersPerPeriod =
    roundAnalyticsMetric(

      trend.length > 0

        ? totalPeriodEngagements /
          trend.length

        : 0

    );

  const engagementRate =
    calculatePercentage(

      uniqueEngagedUsers,

      totalUsers

    );

  const peakEngagementPeriod =

    totalPeriodEngagements > 0

      ? trend.reduce((highest, current) =>

          current.count > highest.count

            ? current

            : highest

        )

      : null;

  // ===================================
  // RETURN ENGAGEMENT ANALYTICS
  // ===================================

  return {

    summary: {

      totalUsers,

      uniqueEngagedUsers,

      engagementRate,

      averageEngagedUsersPerPeriod,

      peakEngagementPeriod,

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
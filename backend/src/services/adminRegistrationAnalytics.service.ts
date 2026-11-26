import User from "../models/user.model.js";

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
  calculatePercentageChange,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// REGISTRATION AGGREGATION INTERFACE
// =====================================

interface RegistrationAggregation {

  date: Date;

  count: number;

}

// =====================================
// REGISTRATION GROWTH ANALYTICS
// =====================================

export const getRegistrationAnalytics = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  period: AnalyticsPeriod =
    ANALYTICS_PERIODS.DAILY

) => {

  const now = new Date();

  const range =
    getAnalyticsDateRange(days, now);

  // ===================================
  // CALCULATE PREVIOUS PERIOD
  // ===================================

  const duration =

    range.endDate.getTime() -

    range.startDate.getTime();

  const previousPeriodEnd =
    new Date(range.startDate);

  const previousPeriodStart =
    new Date(

      previousPeriodEnd.getTime() -
      duration

    );

  // ===================================
  // EXECUTE DATABASE QUERIES
  // ===================================

  const [

    registrationRecords,

    previousPeriodCount,

  ] = await Promise.all([

    User.aggregate<RegistrationAggregation>([

      {
        $match: {

          role: "user",

          createdAt: {

            $gte: range.startDate,

            $lt: range.endDate,

          },

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

    User.countDocuments({

      role: "user",

      createdAt: {

        $gte: previousPeriodStart,

        $lt: previousPeriodEnd,

      },

    })

      .maxTimeMS(

        ADMIN_ANALYTICS_CONFIG
          .aggregationTimeoutMs

      )

      .exec(),

  ]);

  // ===================================
  // NORMALIZE REGISTRATION TREND
  // ===================================

  const trend = fillMissingPeriods(

    registrationRecords,

    range,

    period

  );

  // ===================================
  // CALCULATE TOTAL REGISTRATIONS
  // ===================================

  const totalRegistrations =
    trend.reduce(

      (total, point) =>
        total + point.count,

      0

    );

  const averageDailyRegistrations =
    roundAnalyticsMetric(

      totalRegistrations / range.days

    );

  // ===================================
  // FIND HIGHEST REGISTRATION PERIOD
  // ===================================

  const peakPeriod =

    totalRegistrations > 0

      ? trend.reduce((highest, current) =>

          current.count > highest.count

            ? current

            : highest

        )

      : null;

  // ===================================
  // CALCULATE REGISTRATION GROWTH
  // ===================================

  const growthPercentage =
    calculatePercentageChange(

      totalRegistrations,

      previousPeriodCount

    );

  // ===================================
  // RETURN REGISTRATION ANALYTICS
  // ===================================

  return {

    summary: {

      totalRegistrations,

      previousPeriodRegistrations:
        previousPeriodCount,

      growthPercentage,

      averageDailyRegistrations,

      peakPeriod,

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
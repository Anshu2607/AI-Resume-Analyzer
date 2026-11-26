import User from "../models/user.model.js";

import {
  ADMIN_ANALYTICS_CONFIG,
  ANALYTICS_PERIODS,
} from "../config/adminAnalytics.config.js";

import {
  startOfUtcDay,
  startOfAnalyticsPeriod,
  getAnalyticsDateRange,
  getRollingStartDate,
  calculatePercentage,
  calculatePercentageChange,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// USER OVERVIEW RESPONSE INTERFACE
// =====================================

export interface UserAnalyticsOverview {

  accounts: {

    totalUsers: number;

    enabledAccounts: number;

    suspendedAccounts: number;

  };

  registrations: {

    today: number;

    thisWeek: number;

    thisMonth: number;

    selectedPeriod: number;

    previousPeriod: number;

    growthPercentage: number | null;

  };

  engagement: {

    dailyActiveUsers: number;

    weeklyActiveUsers: number;

    monthlyActiveUsers: number;

    engagementRate: number;

    dauMauRatio: number;

  };

  dateRange: {

    days: number;

    startDate: string;

    endDate: string;

    timezone: string;

  };

  generatedAt: string;

}

// =====================================
// COUNT REGULAR USERS
// =====================================

const countUsers = async (

  filter: Record<string, unknown> = {}

): Promise<number> => {

  return User.countDocuments({

    ...filter,

    role: "user",

  })

    .maxTimeMS(
      ADMIN_ANALYTICS_CONFIG
        .aggregationTimeoutMs
    )

    .exec();

};

// =====================================
// COUNT USER REGISTRATIONS
// =====================================

const countRegistrations = async (

  startDate: Date,

  endDate: Date

): Promise<number> => {

  return countUsers({

    createdAt: {

      $gte: startDate,

      $lt: endDate,

    },

  });

};

// =====================================
// COUNT ACTIVE USERS
// =====================================

const countActiveUsers = async (

  startDate: Date,

  endDate: Date

): Promise<number> => {

  return countUsers({

    lastActiveAt: {

      $gte: startDate,

      $lt: endDate,

    },

  });

};

// =====================================
// USER OVERVIEW ANALYTICS
// =====================================

export const getUserAnalyticsOverview = async (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays

): Promise<UserAnalyticsOverview> => {

  const now = new Date();

  // ===================================
  // CALCULATE CALENDAR PERIODS
  // ===================================

  const todayStart =
    startOfUtcDay(now);

  const weekStart =
    startOfAnalyticsPeriod(

      now,

      ANALYTICS_PERIODS.WEEKLY

    );

  const monthStart =
    startOfAnalyticsPeriod(

      now,

      ANALYTICS_PERIODS.MONTHLY

    );

  // ===================================
  // CALCULATE ROLLING ACTIVITY WINDOWS
  // ===================================

  const weeklyActiveStart =
    getRollingStartDate(7, now);

  const monthlyActiveStart =
    getRollingStartDate(30, now);

  // ===================================
  // SELECTED ANALYTICS DATE RANGE
  // ===================================

  const range =
    getAnalyticsDateRange(days, now);

  // Calculate an equally long previous
  // period for a fair growth comparison.

  const selectedPeriodDuration =

    range.endDate.getTime() -

    range.startDate.getTime();

  const previousPeriodEnd =
    new Date(range.startDate);

  const previousPeriodStart =
    new Date(

      previousPeriodEnd.getTime() -

      selectedPeriodDuration

    );

  // ===================================
  // EXECUTE ANALYTICS QUERIES
  // ===================================

  const [

    totalUsers,

    enabledAccounts,

    suspendedAccounts,

    registrationsToday,

    registrationsThisWeek,

    registrationsThisMonth,

    selectedPeriodRegistrations,

    previousPeriodRegistrations,

    dailyActiveUsers,

    weeklyActiveUsers,

    monthlyActiveUsers,

  ] = await Promise.all([

    // Total registered regular users.

    countUsers(),

    // Enabled accounts.

    countUsers({

      status: "active",

    }),

    // Suspended accounts.

    countUsers({

      status: "suspended",

    }),

    // Registrations today.

    countRegistrations(
      todayStart,
      now
    ),

    // Registrations this calendar week.

    countRegistrations(
      weekStart,
      now
    ),

    // Registrations this calendar month.

    countRegistrations(
      monthStart,
      now
    ),

    // Registrations in selected range.

    countRegistrations(
      range.startDate,
      range.endDate
    ),

    // Registrations in previous range.

    countRegistrations(
      previousPeriodStart,
      previousPeriodEnd
    ),

    // Daily active users.

    countActiveUsers(
      todayStart,
      now
    ),

    // Weekly active users.

    countActiveUsers(
      weeklyActiveStart,
      now
    ),

    // Monthly active users.

    countActiveUsers(
      monthlyActiveStart,
      now
    ),

  ]);

  // ===================================
  // CALCULATE REGISTRATION GROWTH
  // ===================================

  const growthPercentage =
    calculatePercentageChange(

      selectedPeriodRegistrations,

      previousPeriodRegistrations

    );

  // ===================================
  // CALCULATE USER ENGAGEMENT
  // ===================================

  const engagementRate =
    calculatePercentage(

      monthlyActiveUsers,

      totalUsers

    );

  const dauMauRatio =
    calculatePercentage(

      dailyActiveUsers,

      monthlyActiveUsers

    );

  // ===================================
  // RETURN ANALYTICS RESPONSE
  // ===================================

  return {

    accounts: {

      totalUsers,

      enabledAccounts,

      suspendedAccounts,

    },

    registrations: {

      today: registrationsToday,

      thisWeek: registrationsThisWeek,

      thisMonth: registrationsThisMonth,

      selectedPeriod:
        selectedPeriodRegistrations,

      previousPeriod:
        previousPeriodRegistrations,

      growthPercentage,

    },

    engagement: {

      dailyActiveUsers,

      weeklyActiveUsers,

      monthlyActiveUsers,

      engagementRate,

      dauMauRatio,

    },

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
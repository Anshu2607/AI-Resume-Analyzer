import {
  ADMIN_ANALYTICS_CONFIG,
  ANALYTICS_PERIODS,
  ANALYTICS_RANGES,
} from "../config/adminAnalytics.config.js";

import type {
  AnalyticsPeriod,
} from "../config/adminAnalytics.config.js";

// =====================================
// ANALYTICS INTERFACES
// =====================================

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
  days: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  count: number;
}

// =====================================
// START OF UTC DAY
// =====================================

export const startOfUtcDay = (
  date: Date
): Date => {

  const result = new Date(date);

  result.setUTCHours(0, 0, 0, 0);

  return result;

};

// =====================================
// CALCULATE ANALYTICS DATE RANGE
// =====================================

export const getAnalyticsDateRange = (

  days: number =
    ADMIN_ANALYTICS_CONFIG.defaultRangeDays,

  now: Date = new Date()

): AnalyticsDateRange => {

  if (
    !ANALYTICS_RANGES.some(
      (range) => range === days
    )
  ) {
    throw new Error("Invalid analytics date range");
  }

  const endDate = new Date(now);

  const startDate = startOfUtcDay(now);

  startDate.setUTCDate(
    startDate.getUTCDate() - (days - 1)
  );

  return {
    startDate,
    endDate,
    days,
  };

};

// =====================================
// CALCULATE ROLLING DATE RANGE
// =====================================

export const getRollingStartDate = (

  days: number,

  now: Date = new Date()

): Date => {

  if (
    !Number.isInteger(days) ||
    days < 1 ||
    days > ADMIN_ANALYTICS_CONFIG.maxRangeDays
  ) {
    throw new Error("Invalid rolling date range");
  }

  return new Date(

    now.getTime() -

    days *
      ADMIN_ANALYTICS_CONFIG.millisecondsPerDay

  );

};

// =====================================
// START OF ANALYTICS PERIOD
// =====================================

export const startOfAnalyticsPeriod = (

  date: Date,

  period: AnalyticsPeriod

): Date => {

  const result = startOfUtcDay(date);

  switch (period) {

    case ANALYTICS_PERIODS.DAILY:

      return result;

    case ANALYTICS_PERIODS.WEEKLY: {

      // Monday is the start of the week.

      const day = result.getUTCDay();

      const difference = (day + 6) % 7;

      result.setUTCDate(
        result.getUTCDate() - difference
      );

      return result;

    }

    case ANALYTICS_PERIODS.MONTHLY:

      result.setUTCDate(1);

      return result;

    default:

      throw new Error(
        "Unsupported analytics period"
      );

  }

};

// =====================================
// ADVANCE TO NEXT ANALYTICS PERIOD
// =====================================

export const advanceAnalyticsPeriod = (

  date: Date,

  period: AnalyticsPeriod

): Date => {

  const result =
    startOfAnalyticsPeriod(date, period);

  switch (period) {

    case ANALYTICS_PERIODS.DAILY:

      result.setUTCDate(
        result.getUTCDate() + 1
      );

      break;

    case ANALYTICS_PERIODS.WEEKLY:

      result.setUTCDate(
        result.getUTCDate() + 7
      );

      break;

    case ANALYTICS_PERIODS.MONTHLY:

      result.setUTCMonth(
        result.getUTCMonth() + 1
      );

      break;

    default:

      throw new Error(
        "Unsupported analytics period"
      );

  }

  return result;

};

// =====================================
// MONGODB DATE GROUPING EXPRESSION
// =====================================

export const getDateGroupingExpression = (

  field: string,

  period: AnalyticsPeriod

) => {

  const dateField = field.startsWith("$")

    ? field

    : `$${field}`;

  switch (period) {

    case ANALYTICS_PERIODS.DAILY:

      return {

        $dateTrunc: {

          date: dateField,

          unit: "day",

          timezone:
            ADMIN_ANALYTICS_CONFIG.defaultTimezone,

        },

      };

    case ANALYTICS_PERIODS.WEEKLY:

      return {

        $dateTrunc: {

          date: dateField,

          unit: "week",

          startOfWeek: "monday",

          timezone:
            ADMIN_ANALYTICS_CONFIG.defaultTimezone,

        },

      };

    case ANALYTICS_PERIODS.MONTHLY:

      return {

        $dateTrunc: {

          date: dateField,

          unit: "month",

          timezone:
            ADMIN_ANALYTICS_CONFIG.defaultTimezone,

        },

      };

    default:

      throw new Error(
        "Unsupported analytics period"
      );

  }

};

// =====================================
// FORMAT ANALYTICS DATE
// =====================================

export const formatAnalyticsDate = (
  date: Date
): string => {

  return date
    .toISOString()
    .slice(0, 10);

};

// =====================================
// FILL MISSING ANALYTICS PERIODS
// =====================================

export const fillMissingPeriods = (

  records: Array<{
    date: Date | string;
    count: number;
  }>,

  range: AnalyticsDateRange,

  period: AnalyticsPeriod

): AnalyticsTrendPoint[] => {

  const recordMap =
    new Map<string, number>();

  for (const record of records) {

    const recordDate =
      new Date(record.date);

    if (
      !Number.isFinite(
        recordDate.getTime()
      )
    ) {
      continue;
    }

    const date =
      formatAnalyticsDate(

        startOfAnalyticsPeriod(
          recordDate,
          period
        )

      );

    const count =

      Number.isFinite(record.count) &&
      record.count >= 0

        ? record.count

        : 0;

    recordMap.set(

      date,

      (recordMap.get(date) ?? 0) + count

    );

  }

  const result: AnalyticsTrendPoint[] = [];

  let currentDate =
    startOfAnalyticsPeriod(

      range.startDate,

      period

    );

  const finalDate =
    startOfAnalyticsPeriod(

      range.endDate,

      period

    );

  while (
    currentDate.getTime() <=
    finalDate.getTime()
  ) {

    const date =
      formatAnalyticsDate(currentDate);

    result.push({

      date,

      count:
        recordMap.get(date) ?? 0,

    });

    currentDate =
      advanceAnalyticsPeriod(

        currentDate,

        period

      );

  }

  return result;

};

// =====================================
// SAFE PERCENTAGE CALCULATION
// =====================================

export const calculatePercentage = (

  numerator: number,

  denominator: number

): number => {

  if (

    !Number.isFinite(numerator) ||

    !Number.isFinite(denominator) ||

    numerator < 0 ||

    denominator <= 0

  ) {
    return 0;
  }

  return Number(

    (
      (numerator / denominator) * 100
    ).toFixed(2)

  );

};

// =====================================
// PERCENTAGE CHANGE
// =====================================

export const calculatePercentageChange = (

  current: number,

  previous: number

): number | null => {

  if (

    !Number.isFinite(current) ||

    !Number.isFinite(previous) ||

    current < 0 ||

    previous < 0

  ) {
    return null;
  }

  if (previous === 0) {

    return current === 0
      ? 0
      : null;

  }

  return Number(

    (
      ((current - previous) / previous) *
      100
    ).toFixed(2)

  );

};

// =====================================
// ROUND ANALYTICS METRIC
// =====================================

export const roundAnalyticsMetric = (

  value: number,

  decimalPlaces = 2

): number => {

  if (!Number.isFinite(value)) {
    return 0;
  }

  const precision = Math.min(

    6,

    Math.max(
      0,
      Math.trunc(decimalPlaces)
    )

  );

  return Number(
    value.toFixed(precision)
  );

};
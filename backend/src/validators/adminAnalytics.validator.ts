import { z } from "zod";

import {
  ADMIN_ANALYTICS_CONFIG,
  ANALYTICS_RANGES,
  ANALYTICS_PERIODS,
} from "../config/adminAnalytics.config.js";

// =====================================
// ANALYTICS DATE RANGE VALIDATION
// =====================================

const analyticsRangeSchema = z

  .enum(["7", "14", "30", "60", "90"])

  .transform((value) => Number(value))

  .refine(

    (value) =>

      ANALYTICS_RANGES.some(
        (range) => range === value
      ) &&

      value <=
        ADMIN_ANALYTICS_CONFIG.maxRangeDays,

    {
      message:
        "Unsupported analytics date range",
    }

  );

// =====================================
// ANALYTICS QUERY VALIDATION
// =====================================

export const adminAnalyticsQuerySchema =
  z.object({

    days: analyticsRangeSchema

      .optional()

      .transform(

        (value) =>

          value ??
          ADMIN_ANALYTICS_CONFIG.defaultRangeDays

      ),

    period: z

      .enum([

        ANALYTICS_PERIODS.DAILY,

        ANALYTICS_PERIODS.WEEKLY,

        ANALYTICS_PERIODS.MONTHLY,

      ])

      .default(
        ANALYTICS_PERIODS.DAILY
      ),

  }).strict();

// =====================================
// VALIDATED QUERY TYPE
// =====================================

export type AdminAnalyticsQuery =

  z.infer<
    typeof adminAnalyticsQuerySchema
  >;
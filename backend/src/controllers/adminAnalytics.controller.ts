import type {
  Request,
  Response,
  RequestHandler,
} from "express";

import {
  adminAnalyticsQuerySchema,
} from "../validators/adminAnalytics.validator.js";

import type {
  AdminAnalyticsQuery,
} from "../validators/adminAnalytics.validator.js";

import {
  getOrSetAnalyticsCache,
} from "../services/adminAnalyticsCache.service.js";

import type {
  AnalyticsCacheType,
} from "../services/adminAnalyticsCache.service.js";

import {
  getUserAnalyticsOverview,
} from "../services/adminUserAnalytics.service.js";

import {
  getRegistrationAnalytics,
} from "../services/adminRegistrationAnalytics.service.js";

import {
  getEngagementAnalytics,
} from "../services/adminEngagementAnalytics.service.js";

import {
  getFeatureAnalytics,
} from "../services/adminFeatureAnalytics.service.js";

import {
  getPerformanceAnalytics,
} from "../services/adminPerformanceAnalytics.service.js";

import {
  getInterviewAnalytics,
} from "../services/adminInterviewAnalytics.service.js";

import {
  getBackgroundAnalytics,
} from "../services/adminBackgroundAnalytics.service.js";

import {
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// ANALYTICS LOADER TYPE
// =====================================

type AnalyticsLoader = (
  query: AdminAnalyticsQuery
) => Promise<unknown>;

// =====================================
// REUSABLE ANALYTICS CONTROLLER
// =====================================

const createAnalyticsController = (

  type: AnalyticsCacheType,

  message: string,

  loader: AnalyticsLoader,

  supportsPeriod = false

): RequestHandler => {

  return async (

    req: Request,

    res: Response

  ): Promise<void> => {

    try {

      // Validate query parameters.

      const validation =
        adminAnalyticsQuerySchema.safeParse(
          req.query
        );

      if (!validation.success) {

        res.status(400).json({

          success: false,

          message:
            "Invalid analytics query parameters",

          errors:
            validation.error.issues,

        });

        return;

      }

      const query =
        validation.data;

      // Retrieve cached analytics or
      // execute the MongoDB query.

      const analytics =
        await getOrSetAnalyticsCache(

          {

            type,

            days: query.days,

            period: supportsPeriod

              ? query.period

              : undefined,

          },

          () => loader(query)

        );

      // Prevent browser or intermediary
      // caching of administrator responses.

      res.setHeader(
        "Cache-Control",
        "no-store"
      );

      res.status(200).json({

        success: true,

        message,

        data: analytics,

      });

    } catch (error) {

      logApplicationError(

        error,

        `admin_analytics_${type}`

      );

      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve administrator analytics",

      });

    }

  };

};

// =====================================
// ADMINISTRATOR OVERVIEW
// =====================================

export const getAdminOverviewController =
  createAnalyticsController(

    "overview",

    "Administrator overview retrieved successfully",

    async (query) => {

      const [

        users,

        features,

        performance,

        interviews,

        backgroundJobs,

      ] = await Promise.all([

        getOrSetAnalyticsCache(

          {
            type: "users",
            days: query.days,
          },

          () =>
            getUserAnalyticsOverview(
              query.days
            )

        ),

        getOrSetAnalyticsCache(

          {
            type: "features",
            days: query.days,
          },

          () =>
            getFeatureAnalytics(
              query.days
            )

        ),

        getOrSetAnalyticsCache(

          {
            type: "performance",
            days: query.days,
            period: "daily",
          },

          () =>
            getPerformanceAnalytics(
              query.days,
              "daily"
            )

        ),

        getOrSetAnalyticsCache(

          {
            type: "interviews",
            days: query.days,
            period: "daily",
          },

          () =>
            getInterviewAnalytics(
              query.days,
              "daily"
            )

        ),

        getOrSetAnalyticsCache(

          {
            type: "background-jobs",
            days: query.days,
            period: "daily",
          },

          () =>
            getBackgroundAnalytics(
              query.days,
              "daily"
            )

        ),

      ]);

      return {

        users: {

          accounts:
            users.accounts,

          registrations:
            users.registrations,

          engagement:
            users.engagement,

        },

        features:
          features.summary,

        performance:
          performance.summary,

        interviews:
          interviews.summary,

        backgroundJobs:
          backgroundJobs.summary,

        dateRange:
          users.dateRange,

        generatedAt:
          new Date().toISOString(),

      };

    }

  );

// =====================================
// USER ACCOUNT ANALYTICS
// =====================================

export const getAdminUsersAnalyticsController =
  createAnalyticsController(

    "users",

    "User analytics retrieved successfully",

    (query) =>
      getUserAnalyticsOverview(
        query.days
      )

  );

// =====================================
// REGISTRATION ANALYTICS
// =====================================

export const getAdminRegistrationsController =
  createAnalyticsController(

    "registrations",

    "Registration analytics retrieved successfully",

    (query) =>
      getRegistrationAnalytics(

        query.days,

        query.period

      ),

    true

  );

// =====================================
// USER ENGAGEMENT ANALYTICS
// =====================================

export const getAdminEngagementController =
  createAnalyticsController(

    "engagement",

    "Engagement analytics retrieved successfully",

    (query) =>
      getEngagementAnalytics(

        query.days,

        query.period

      ),

    true

  );

// =====================================
// FEATURE USAGE ANALYTICS
// =====================================

export const getAdminFeaturesController =
  createAnalyticsController(

    "features",

    "Feature analytics retrieved successfully",

    (query) =>
      getFeatureAnalytics(
        query.days
      )

  );

// =====================================
// API PERFORMANCE ANALYTICS
// =====================================

export const getAdminPerformanceController =
  createAnalyticsController(

    "performance",

    "Performance analytics retrieved successfully",

    (query) =>
      getPerformanceAnalytics(

        query.days,

        query.period

      ),

    true

  );

// =====================================
// INTERVIEW ANALYTICS
// =====================================

export const getAdminInterviewsController =
  createAnalyticsController(

    "interviews",

    "Interview analytics retrieved successfully",

    (query) =>
      getInterviewAnalytics(

        query.days,

        query.period

      ),

    true

  );

// =====================================
// BACKGROUND JOB ANALYTICS
// =====================================

export const getAdminBackgroundJobsController =
  createAnalyticsController(

    "background-jobs",

    "Background job analytics retrieved successfully",

    (query) =>
      getBackgroundAnalytics(

        query.days,

        query.period

      ),

    true

  );
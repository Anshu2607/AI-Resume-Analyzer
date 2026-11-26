import { Types } from "mongoose";

import User from "../models/user.model.js";

import Resume from "../models/resume.model.js";

import InterviewSession from "../models/interviewSession.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  AdminUserManagementError,
} from "./adminUserManagement.service.js";

import {
  ADMIN_USER_MANAGEMENT_CONFIG,
} from "../config/adminUserManagement.config.js";

import {
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import {
  calculatePercentage,
  roundAnalyticsMetric,
} from "../utils/adminAnalytics.utils.js";

// =====================================
// QUERY CONFIGURATION
// =====================================

const QUERY_TIMEOUT =
  ADMIN_USER_MANAGEMENT_CONFIG.queryTimeoutMs;

// =====================================
// ACTIVITY AGGREGATION INTERFACE
// =====================================

interface ActivitySummary {

  totalActivities: number;

  successfulActivities: number;

  failedActivities: number;

  averageDurationMs: number | null;

}

interface FeatureUsage {

  _id: string;

  count: number;

}

// =====================================
// INTERVIEW STATISTICS INTERFACE
// =====================================

interface InterviewStatistics {

  totalInterviews: number;

  completedInterviews: number;

  inProgressInterviews: number;

  cancelledInterviews: number;

  averageScore: number | null;

}

// =====================================
// RETRIEVE INDIVIDUAL USER PROFILE
// =====================================

export const getAdminUserProfile = async (

  userId: string

) => {

  // Validate user ID.

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {

    throw new AdminUserManagementError(

      "Invalid user ID",

      400

    );

  }

  const objectId =
    new Types.ObjectId(userId);

  // ===================================
  // RETRIEVE SAFE ACCOUNT INFORMATION
  // ===================================

  const user = await User.findOne({

    _id: objectId,

    role: "user",

  })

    .select(

      "_id name email role status " +

      "createdAt updatedAt lastLoginAt " +

      "lastActiveAt loginCount suspendedAt"

    )

    .maxTimeMS(QUERY_TIMEOUT)

    .lean()

    .exec();

  if (!user) {

    throw new AdminUserManagementError(

      "User not found",

      404

    );

  }

  // ===================================
  // EXECUTE ACCOUNT STATISTICS QUERIES
  // ===================================

  const [

    totalResumes,

    activityRecords,

    featureUsage,

    interviewRecords,

    recentActivities,

  ] = await Promise.all([

    // Count user resumes.

    Resume.countDocuments({

      userId: objectId,

    })

      .maxTimeMS(QUERY_TIMEOUT)

      .exec(),

    // Calculate retained activity statistics.

    UserActivity.aggregate<ActivitySummary>([

      {
        $match: {

          userId: objectId,

        },
      },

      {
        $group: {

          _id: null,

          totalActivities: {
            $sum: 1,
          },

          successfulActivities: {

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

          failedActivities: {

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

          averageDurationMs: {

            $avg: {

              $cond: [

                {
                  $isNumber: "$statusCode",
                },

                "$durationMs",

                null,

              ],

            },

          },

        },
      },

    ])

      .option({
        maxTimeMS: QUERY_TIMEOUT,
      })

      .exec(),

    // Calculate most frequent activities.

    UserActivity.aggregate<FeatureUsage>([

      {
        $match: {

          userId: objectId,

        },
      },

      {
        $group: {

          _id: "$activityType",

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

      {
        $limit: 10,
      },

    ])

      .option({
        maxTimeMS: QUERY_TIMEOUT,
      })

      .exec(),

    // Calculate interview statistics.

    InterviewSession.aggregate<InterviewStatistics>([

      {
        $match: {

          userId: objectId,

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
        maxTimeMS: QUERY_TIMEOUT,
      })

      .exec(),

    // Retrieve recent activity metadata.

    UserActivity.find({

      userId: objectId,

    })

      .select(

        "_id activityType outcome " +

        "statusCode durationMs createdAt"

      )

      .sort({

        createdAt: -1,

        _id: -1,

      })

      .limit(10)

      .maxTimeMS(QUERY_TIMEOUT)

      .lean()

      .exec(),

  ]);

  // ===================================
  // NORMALIZE ACTIVITY STATISTICS
  // ===================================

  const activities = activityRecords[0] ?? {

    totalActivities: 0,

    successfulActivities: 0,

    failedActivities: 0,

    averageDurationMs: null,

  };

  // ===================================
  // NORMALIZE INTERVIEW STATISTICS
  // ===================================

  const interviews = interviewRecords[0] ?? {

    totalInterviews: 0,

    completedInterviews: 0,

    inProgressInterviews: 0,

    cancelledInterviews: 0,

    averageScore: null,

  };

  // ===================================
  // RETURN INDIVIDUAL USER PROFILE
  // ===================================

  return {

    account: {

      id: user._id.toString(),

      name: user.name,

      email: user.email,

      role: user.role,

      status: user.status,

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,

      lastLoginAt:
        user.lastLoginAt ?? null,

      lastActiveAt:
        user.lastActiveAt ?? null,

      loginCount:
        user.loginCount ?? 0,

      suspendedAt:
        user.suspendedAt ?? null,

    },

    resources: {

      totalResumes,

    },

    activity: {

      totalActivities:
        activities.totalActivities,

      successfulActivities:
        activities.successfulActivities,

      failedActivities:
        activities.failedActivities,

      successRate:

        activities.totalActivities > 0

          ? calculatePercentage(

              activities.successfulActivities,

              activities.totalActivities

            )

          : null,

      averageDurationMs:

        activities.averageDurationMs != null

          ? roundAnalyticsMetric(

              activities.averageDurationMs

            )

          : null,

    },

    interviews: {

      totalInterviews:
        interviews.totalInterviews,

      completedInterviews:
        interviews.completedInterviews,

      inProgressInterviews:
        interviews.inProgressInterviews,

      cancelledInterviews:
        interviews.cancelledInterviews,

      completionRate:

        interviews.totalInterviews > 0

          ? calculatePercentage(

              interviews.completedInterviews,

              interviews.totalInterviews

            )

          : null,

      averageScore:

        interviews.averageScore != null

          ? roundAnalyticsMetric(
              interviews.averageScore
            )

          : null,

    },

    featureUsage: featureUsage.map(

      (item) => ({

        activityType: item._id,

        count: item.count,

      })

    ),

    recentActivities: recentActivities.map(

      (item) => ({

        id: item._id.toString(),

        activityType: item.activityType,

        outcome: item.outcome,

        statusCode: item.statusCode,

        durationMs: item.durationMs,

        createdAt: item.createdAt,

      })

    ),

    generatedAt:
      new Date().toISOString(),

  };

};
import { Types } from "mongoose";

import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  AdminUserManagementError,
} from "./adminUserManagement.service.js";

import {
  ADMIN_USER_MANAGEMENT_CONFIG,
} from "../config/adminUserManagement.config.js";

import {
  ACTIVITY_CONFIG,
} from "../config/activity.config.js";

import type {
  ActivityType,
  ActivityOutcome,
} from "../config/activity.config.js";

import type {
  AdminUserActivityQuery,
} from "../validators/adminUserManagement.validator.js";

// =====================================
// ACTIVITY FILTER INTERFACE
// =====================================

interface UserActivityFilter {

  userId: Types.ObjectId;

  activityType?: ActivityType;

  outcome?: ActivityOutcome;

}

// =====================================
// QUERY CONFIGURATION
// =====================================

const QUERY_TIMEOUT =
  ADMIN_USER_MANAGEMENT_CONFIG.queryTimeoutMs;

// =====================================
// RETRIEVE USER ACTIVITY HISTORY
// =====================================

export const getAdminUserActivities = async (

  userId: string,

  query: AdminUserActivityQuery

) => {

  // Validate MongoDB user ID.

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {

    throw new AdminUserManagementError(

      "Invalid user ID",

      400

    );

  }

  const objectId =
    new Types.ObjectId(userId);

  // ===================================
  // VERIFY REGULAR USER EXISTS
  // ===================================

  const user = await User.findOne({

    _id: objectId,

    role: "user",

  })

    .select("_id name email status")

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
  // BUILD ACTIVITY FILTER
  // ===================================

  const filter: UserActivityFilter = {

    userId: objectId,

  };

  if (query.activityType) {

    filter.activityType =
      query.activityType;

  }

  if (query.outcome) {

    filter.outcome =
      query.outcome;

  }

  // ===================================
  // CALCULATE PAGINATION
  // ===================================

  const {

    page,

    limit,

  } = query;

  const skip =
    (page - 1) * limit;

  // ===================================
  // EXECUTE DATABASE QUERIES
  // ===================================

  const [

    activities,

    totalActivities,

  ] = await Promise.all([

    UserActivity.find(filter)

      .select(

        "_id activityType outcome " +

        "statusCode durationMs createdAt"

      )

      .sort({

        createdAt: -1,

        _id: -1,

      })

      .skip(skip)

      .limit(limit)

      .maxTimeMS(QUERY_TIMEOUT)

      .lean()

      .exec(),

    UserActivity.countDocuments(filter)

      .maxTimeMS(QUERY_TIMEOUT)

      .exec(),

  ]);

  // ===================================
  // FORMAT ACTIVITY RECORDS
  // ===================================

  const formattedActivities =
    activities.map((activity) => ({

      id:
        activity._id.toString(),

      activityType:
        activity.activityType,

      outcome:
        activity.outcome,

      statusCode:
        activity.statusCode ?? null,

      durationMs:
        activity.durationMs ?? null,

      createdAt:
        activity.createdAt,

    }));

  // ===================================
  // CALCULATE PAGINATION METADATA
  // ===================================

  const totalPages =
    Math.ceil(totalActivities / limit);

  // ===================================
  // RETURN USER ACTIVITY HISTORY
  // ===================================

  return {

    user: {

      id: user._id.toString(),

      name: user.name,

      email: user.email,

      status: user.status,

    },

    activities:
      formattedActivities,

    pagination: {

      page,

      limit,

      totalActivities,

      totalPages,

      hasNextPage:
        page < totalPages,

      hasPreviousPage:
        page > 1 && totalPages > 0,

    },

    filters: {

      activityType:
        query.activityType ?? null,

      outcome:
        query.outcome ?? null,

    },

    retention: {

      days:
        ACTIVITY_CONFIG.retentionDays,

    },

    generatedAt:
      new Date().toISOString(),

  };

};
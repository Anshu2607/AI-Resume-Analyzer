import { z } from "zod";

import {

  ADMIN_USER_MANAGEMENT_CONFIG,

  ADMIN_USER_STATUS_FILTERS,

  ADMIN_USER_SORT_FIELDS,

  ADMIN_USER_SORT_ORDERS,

} from "../config/adminUserManagement.config.js";

import {

  ACTIVITY_TYPES,

  ACTIVITY_OUTCOMES,

} from "../config/activity.config.js";

// =====================================
// PAGINATION VALIDATION
// =====================================

const pageSchema = z

  .string()

  .regex(/^[1-9]\d*$/)

  .transform(Number)

  .pipe(

    z.number()

      .int()

      .min(1)

      .max(
        ADMIN_USER_MANAGEMENT_CONFIG
          .pagination.maxPage
      )

  )

  .optional()

  .transform(

    (value) =>

      value ??
      ADMIN_USER_MANAGEMENT_CONFIG
        .pagination.defaultPage

  );

const limitSchema = z

  .string()

  .regex(/^[1-9]\d*$/)

  .transform(Number)

  .pipe(

    z.number()

      .int()

      .min(1)

      .max(
        ADMIN_USER_MANAGEMENT_CONFIG
          .pagination.maxLimit
      )

  )

  .optional()

  .transform(

    (value) =>

      value ??
      ADMIN_USER_MANAGEMENT_CONFIG
        .pagination.defaultLimit

  );

// =====================================
// USER LIST QUERY
// =====================================

export const adminUserListQuerySchema =
  z.object({

    page: pageSchema,

    limit: limitSchema,

    search: z

      .string()

      .trim()

      .max(
        ADMIN_USER_MANAGEMENT_CONFIG
          .search.maxLength
      )

      .default(""),

    status: z

      .enum(
        ADMIN_USER_STATUS_FILTERS
      )

      .default("all"),

    sortBy: z

      .enum(
        ADMIN_USER_SORT_FIELDS
      )

      .default("createdAt"),

    sortOrder: z

      .enum(
        ADMIN_USER_SORT_ORDERS
      )

      .default("desc"),

  }).strict();

// =====================================
// MONGODB USER ID VALIDATION
// =====================================

export const adminUserIdSchema =
  z.object({

    userId: z

      .string()

      .regex(
        /^[a-fA-F0-9]{24}$/,

        "Invalid user ID"
      ),

  }).strict();

// =====================================
// SUSPEND USER VALIDATION
// =====================================

export const suspendUserSchema =
  z.object({

    reason: z

      .string()

      .trim()

      .min(

        ADMIN_USER_MANAGEMENT_CONFIG
          .suspension.minReasonLength

      )

      .max(

        ADMIN_USER_MANAGEMENT_CONFIG
          .suspension.maxReasonLength

      ),

  }).strict();

// =====================================
// REACTIVATE USER VALIDATION
// =====================================

export const reactivateUserSchema =
  z.object({

    reason: z

      .string()

      .trim()

      .min(

        ADMIN_USER_MANAGEMENT_CONFIG
          .suspension.minReasonLength

      )

      .max(

        ADMIN_USER_MANAGEMENT_CONFIG
          .suspension.maxReasonLength

      ),

  }).strict();

// =====================================
// USER ACTIVITY QUERY
// =====================================

export const adminUserActivityQuerySchema =
  z.object({

    page: pageSchema,

    limit: limitSchema,

    activityType: z

      .enum(ACTIVITY_TYPES)

      .optional(),

    outcome: z

      .enum(ACTIVITY_OUTCOMES)

      .optional(),

  }).strict();

// =====================================
// VALIDATED REQUEST TYPES
// =====================================

export type AdminUserListQuery =

  z.infer<
    typeof adminUserListQuerySchema
  >;

export type AdminUserActivityQuery =

  z.infer<
    typeof adminUserActivityQuerySchema
  >;

export type SuspendUserInput =

  z.infer<
    typeof suspendUserSchema
  >;

export type ReactivateUserInput =

  z.infer<
    typeof reactivateUserSchema
  >;
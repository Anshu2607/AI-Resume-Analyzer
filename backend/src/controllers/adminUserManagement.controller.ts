import type {

  Response,

  NextFunction,

  RequestHandler,

} from "express";

import type {

  AuthenticatedRequest,

} from "../middleware/auth.middleware.js";

import {

  adminUserListQuerySchema,

  adminUserIdSchema,

  adminUserActivityQuerySchema,

  suspendUserSchema,

  reactivateUserSchema,

} from "../validators/adminUserManagement.validator.js";

import {

  getAdminUsers,

  AdminUserManagementError,

} from "../services/adminUserManagement.service.js";

import {

  getAdminUserProfile,

} from "../services/adminUserProfile.service.js";

import {

  getAdminUserActivities,

} from "../services/adminUserActivity.service.js";

import {

  suspendAdminUser,

  reactivateAdminUser,

} from "../services/adminUserStatus.service.js";

import {

  getRequestId,

  logApplicationError,

} from "../utils/logger.utils.js";

// =====================================
// CENTRAL ERROR HANDLER
// =====================================

const handleUserManagementError = (

  error: unknown,

  res: Response,

  operation: string,

  next: NextFunction

): void => {

  if (res.headersSent) {

    next(error);

    return;

  }

  if (error instanceof AdminUserManagementError) {

    res.status(error.statusCode).json({

      success: false,

      message: error.message,

    });

    return;

  }

  logApplicationError(

    error,

    operation

  );

  res.status(500).json({

    success: false,

    message: "Administrator operation failed",

  });

};

// =====================================
// LIST USERS
// =====================================

export const getAdminUsersController: RequestHandler =
  async (req, res, next) => {

    try {

      const validation =
        adminUserListQuerySchema.safeParse(
          req.query
        );

      if (!validation.success) {

        res.status(400).json({

          success: false,

          message: "Invalid user query parameters",

          errors: validation.error.issues,

        });

        return;

      }

      const result =
        await getAdminUsers(validation.data);

      res.status(200).json({

        success: true,

        message: "Users retrieved successfully",

        data: result,

      });

    } catch (error) {

      handleUserManagementError(

        error,

        res,

        "admin_list_users",

        next

      );

    }

  };

// =====================================
// USER PROFILE
// =====================================

export const getAdminUserProfileController: RequestHandler =
  async (req, res, next) => {

    try {

      const validation =
        adminUserIdSchema.safeParse(
          req.params
        );

      if (!validation.success) {

        res.status(400).json({

          success: false,

          message: "Invalid user ID",

        });

        return;

      }

      const result =
        await getAdminUserProfile(

          validation.data.userId

        );

      res.status(200).json({

        success: true,

        message: "User profile retrieved successfully",

        data: result,

      });

    } catch (error) {

      handleUserManagementError(

        error,

        res,

        "admin_get_user_profile",

        next

      );

    }

  };

// =====================================
// USER ACTIVITY HISTORY
// =====================================

export const getAdminUserActivitiesController: RequestHandler =
  async (req, res, next) => {

    try {

      const params =
        adminUserIdSchema.safeParse(
          req.params
        );

      const query =
        adminUserActivityQuerySchema.safeParse(
          req.query
        );

      if (!params.success || !query.success) {

        res.status(400).json({

          success: false,

          message: "Invalid activity query",

        });

        return;

      }

      const result =
        await getAdminUserActivities(

          params.data.userId,

          query.data

        );

      res.status(200).json({

        success: true,

        message: "User activities retrieved successfully",

        data: result,

      });

    } catch (error) {

      handleUserManagementError(

        error,

        res,

        "admin_get_user_activities",

        next

      );

    }

  };

// =====================================
// SUSPEND USER
// =====================================

export const suspendUserController: RequestHandler =
  async (

    req: AuthenticatedRequest,

    res,

    next

  ) => {

    try {

      if (

        !req.user?.userId ||

        req.user.role !== "admin" ||

        req.user.sessionType !== "admin" ||

        req.user.mfaVerified !== true

      ) {

        res.status(403).json({

          success: false,

          message: "MFA-verified administrator session required",

        });

        return;

      }

      const params =
        adminUserIdSchema.safeParse(
          req.params
        );

      const body =
        suspendUserSchema.safeParse(
          req.body
        );

      if (!params.success || !body.success) {

        res.status(400).json({

          success: false,

          message: "Invalid suspension request",

        });

        return;

      }

      const result =
        await suspendAdminUser({

          adminId: req.user.userId,

          userId: params.data.userId,

          reason: body.data.reason,

          requestId: getRequestId(res),

        });

      res.status(200).json({

        success: true,

        message: "User account suspended successfully",

        data: result,

      });

    } catch (error) {

      handleUserManagementError(

        error,

        res,

        "admin_suspend_user",

        next

      );

    }

  };

// =====================================
// REACTIVATE USER
// =====================================

export const reactivateUserController: RequestHandler =
  async (

    req: AuthenticatedRequest,

    res,

    next

  ) => {

    try {

      if (

        !req.user?.userId ||

        req.user.role !== "admin" ||

        req.user.sessionType !== "admin" ||

        req.user.mfaVerified !== true

      ) {

        res.status(403).json({

          success: false,

          message: "MFA-verified administrator session required",

        });

        return;

      }

      const params =
        adminUserIdSchema.safeParse(
          req.params
        );

      const body =
        reactivateUserSchema.safeParse(
          req.body
        );

      if (!params.success || !body.success) {

        res.status(400).json({

          success: false,

          message: "Invalid reactivation request",

        });

        return;

      }

      const result =
        await reactivateAdminUser({

          adminId: req.user.userId,

          userId: params.data.userId,

          reason: body.data.reason,

          requestId: getRequestId(res),

        });

      res.status(200).json({

        success: true,

        message: "User account reactivated successfully",

        data: result,

      });

    } catch (error) {

      handleUserManagementError(

        error,

        res,

        "admin_reactivate_user",

        next

      );

    }

  };
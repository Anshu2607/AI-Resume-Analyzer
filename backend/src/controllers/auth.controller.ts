import type {
  Request,
  Response,
} from "express";

import {
  registerUser,
  loginUser,
  AuthError,
} from "../services/auth.service.js";

import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator.js";

import {
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  recordSuccessfulActivity,
} from "../services/activity.service.js";

import {
  getRequestId,
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// REGULAR USER REGISTRATION
// =====================================

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {

  const startedAt = process.hrtime.bigint();

  try {

    const validation =
      registerSchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Validation failed",

        errors: validation.error.issues,

      });

      return;

    }

    // Register the new user.

    const result =
      await registerUser(validation.data);

    // Calculate processing duration.

    const durationMs = Number(

      process.hrtime.bigint() - startedAt

    ) / 1_000_000;

    // Return successful registration response.

    res.status(201).json({

      success: true,

      message: "Registration successful",

      data: result,

    });

    // =================================
    // RECORD REGISTRATION ACTIVITY
    // =================================

    void recordSuccessfulActivity({

      userId: result.user.id,

      activityType:
        ACTIVITY_TYPES.USER_REGISTERED,

      statusCode: 201,

      durationMs,

      requestId: getRequestId(res),

    }).catch((error) => {

      logApplicationError(

        error,

        "registration_activity_tracking"

      );

    });

  } catch (error) {

    if (error instanceof AuthError) {

      res.status(error.statusCode).json({

        success: false,

        message: error.message,

      });

      return;

    }

    res.status(500).json({

      success: false,

      message: "Internal server error",

    });

  }

};

// =====================================
// REGULAR USER LOGIN
// =====================================

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {

  const startedAt = process.hrtime.bigint();

  try {

    const validation =
      loginSchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Validation failed",

        errors: validation.error.issues,

      });

      return;

    }

    // Authenticate the regular user.

    const result =
      await loginUser(validation.data);

    // Calculate processing duration.

    const durationMs = Number(

      process.hrtime.bigint() - startedAt

    ) / 1_000_000;

    // Return successful login response.

    res.status(200).json({

      success: true,

      message: "Login successful",

      data: result,

    });

    // =================================
    // RECORD LOGIN ACTIVITY
    // =================================

    void recordSuccessfulActivity({

      userId: result.user.id,

      activityType:
        ACTIVITY_TYPES.USER_LOGIN,

      statusCode: 200,

      durationMs,

      requestId: getRequestId(res),

    }).catch((error) => {

      logApplicationError(

        error,

        "login_activity_tracking"

      );

    });

  } catch (error) {

    if (error instanceof AuthError) {

      res.status(error.statusCode).json({

        success: false,

        message: error.message,

      });

      return;

    }

    res.status(500).json({

      success: false,

      message: "Internal server error",

    });

  }

};
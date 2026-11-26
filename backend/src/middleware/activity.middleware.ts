import type {
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import type {
  AuthenticatedRequest,
} from "./auth.middleware.js";

import {
  ACTIVITY_CONFIG,
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import type {
  ActivityType,
} from "../config/activity.config.js";

import {
  recordActivity,
} from "../services/activity.service.js";

import {
  trackUserPresence,
} from "../services/userPresence.service.js";

import {
  getRequestId,
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// AUTOMATIC USER PRESENCE TRACKING
// =====================================

export const trackPresence: RequestHandler = (

  req: AuthenticatedRequest,

  _res: Response,

  next: NextFunction

): void => {

  if (

    ACTIVITY_CONFIG.enabled &&

    req.user?.userId &&

    req.user.role === "user"

  ) {

    void trackUserPresence(
      req.user.userId
    ).catch((error) => {

      logApplicationError(
        error,
        "presence_middleware"
      );

    });

  }

  next();

};

// =====================================
// FEATURE ACTIVITY TRACKING
// =====================================

export const trackActivity = (

  activityType: ActivityType

): RequestHandler => {

  return (

    req: AuthenticatedRequest,

    res: Response,

    next: NextFunction

  ): void => {

    // Skip tracking when disabled.

    if (!ACTIVITY_CONFIG.enabled) {

      next();

      return;

    }

    // Track authenticated regular users only.

    if (
      !req.user?.userId ||
      req.user.role !== "user"
    ) {

      next();

      return;

    }

    const userId = req.user.userId;

    const startedAt = process.hrtime.bigint();

    let recorded = false;

    // =================================
    // RECORD ACTIVITY RESULT
    // =================================

    const recordResult = (

      completed: boolean

    ): void => {

      // Prevent duplicate activity records.

      if (recorded) {
        return;
      }

      recorded = true;

      res.removeListener(
        "finish",
        handleFinish
      );

      res.removeListener(
        "close",
        handleClose
      );

      const durationMs = Number(

        process.hrtime.bigint() - startedAt

      ) / 1_000_000;

      const statusCode = completed

        ? res.statusCode

        : undefined;

      const successful =

        completed &&

        res.statusCode >= 200 &&

        res.statusCode < 300;

      // Store activity without blocking
      // the original API response.

      void recordActivity({

        userId,

        activityType,

        outcome: successful

          ? ACTIVITY_OUTCOMES.SUCCESS

          : ACTIVITY_OUTCOMES.FAILURE,

        statusCode,

        durationMs,

        requestId: getRequestId(res),

      }).catch((error) => {

        logApplicationError(
          error,
          "activity_tracking_middleware"
        );

      });

    };

    // =================================
    // RESPONSE COMPLETED
    // =================================

    const handleFinish = (): void => {

      recordResult(true);

    };

    // =================================
    // CONNECTION CLOSED
    // =================================

    const handleClose = (): void => {

      recordResult(
        res.writableFinished
      );

    };

    // Register response listeners.

    res.once(
      "finish",
      handleFinish
    );

    res.once(
      "close",
      handleClose
    );

    next();

  };

};
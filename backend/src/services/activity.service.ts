import mongoose from "mongoose";

import UserActivity from "../models/userActivity.model.js";

import {
  ACTIVITY_CONFIG,
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import type {
  ActivityType,
  ActivityOutcome,
} from "../config/activity.config.js";

import {
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// ACTIVITY INPUT INTERFACE
// =====================================

export interface RecordActivityInput {

  userId: string;

  activityType: ActivityType;

  outcome: ActivityOutcome;

  statusCode?: number;

  durationMs?: number;

  requestId?: string;

}

// =====================================
// RECORD USER ACTIVITY
// =====================================

export const recordActivity = async (
  input: RecordActivityInput
): Promise<void> => {

  if (!ACTIVITY_CONFIG.enabled) {
    return;
  }

  try {

    // Validate user identifier.

    if (
      !/^[a-fA-F0-9]{24}$/.test(input.userId)
    ) {
      return;
    }

    // Validate activity type.

    if (
      !Object.values(ACTIVITY_TYPES)
        .includes(input.activityType)
    ) {
      return;
    }

    // Validate activity outcome.

    if (
      !Object.values(ACTIVITY_OUTCOMES)
        .includes(input.outcome)
    ) {
      return;
    }

    // Validate optional HTTP status.

    const statusCode =
      typeof input.statusCode === "number" &&
      Number.isInteger(input.statusCode) &&
      input.statusCode >= 100 &&
      input.statusCode <= 599

        ? input.statusCode
        : null;

    // Validate request duration.

    const durationMs =
      typeof input.durationMs === "number" &&
      Number.isFinite(input.durationMs) &&
      input.durationMs >= 0

        ? Math.round(input.durationMs)
        : null;

    // Accept only UUID request identifiers.

    const requestId =
      typeof input.requestId === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        .test(input.requestId)

        ? input.requestId
        : null;

    // Store activity metadata.

    await UserActivity.create({

      userId: new mongoose.Types.ObjectId(
        input.userId
      ),

      activityType: input.activityType,

      outcome: input.outcome,

      statusCode,

      durationMs,

      requestId,

      createdAt: new Date(),

    });

  } catch (error) {

    // Analytics failure must not interrupt
    // the user's original request.

    logApplicationError(
      error,
      "record_user_activity"
    );

  }

};

// =====================================
// RECORD SUCCESSFUL ACTIVITY
// =====================================

export const recordSuccessfulActivity = async (

  input: Omit<RecordActivityInput, "outcome">

): Promise<void> => {

  await recordActivity({

    ...input,

    outcome: ACTIVITY_OUTCOMES.SUCCESS,

  });

};

// =====================================
// RECORD FAILED ACTIVITY
// =====================================

export const recordFailedActivity = async (

  input: Omit<RecordActivityInput, "outcome">

): Promise<void> => {

  await recordActivity({

    ...input,

    outcome: ACTIVITY_OUTCOMES.FAILURE,

  });

};
import { createHash } from "node:crypto";

import { Types } from "mongoose";

import User from "../models/user.model.js";

import UserActivity from "../models/userActivity.model.js";

import {
  ACTIVITY_CONFIG,
  ACTIVITY_TYPES,
  ACTIVITY_OUTCOMES,
} from "../config/activity.config.js";

import {
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// BACKGROUND ACTIVITY INPUT
// =====================================

export interface BackgroundActivityInput {

  jobId: string;

  userId: string;

  jobCreatedAt: number;

  outcome: "success" | "failure";

  durationMs?: number;

  requestId?: string;

}

// =====================================
// GENERATE DETERMINISTIC ACTIVITY ID
// =====================================

const generateActivityId = (

  input: BackgroundActivityInput

): Types.ObjectId => {

  const hash = createHash("sha256")

    .update(
      JSON.stringify([
        "background-job-activity",
        input.userId,
        input.jobId,
        input.jobCreatedAt,
        input.outcome,
      ])
    )

    .digest("hex")

    .slice(0, 24);

  return new Types.ObjectId(hash);

};

// =====================================
// RECORD BACKGROUND JOB ACTIVITY
// =====================================

export const recordBackgroundActivity = async (

  input: BackgroundActivityInput

): Promise<void> => {

  if (!ACTIVITY_CONFIG.enabled) {
    return;
  }

  if (
    !/^[a-fA-F0-9]{24}$/.test(input.userId) ||
    typeof input.jobId !== "string" ||
    !input.jobId.trim() ||
    !Number.isFinite(input.jobCreatedAt) ||
    input.jobCreatedAt <= 0 ||
    !["success", "failure"].includes(input.outcome)
  ) {
    return;
  }

  try {

    // Exclude administrator activities
    // and deleted user accounts.

    const regularUser = await User.exists({

      _id: input.userId,

      role: "user",

    });

    if (!regularUser) {
      return;
    }

    const activityId =
      generateActivityId(input);

    const successful =
      input.outcome === "success";

    const durationMs =

      typeof input.durationMs === "number" &&

      Number.isFinite(input.durationMs) &&

      input.durationMs >= 0

        ? Math.round(input.durationMs)

        : null;

    const requestId =

      typeof input.requestId === "string" &&

      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        .test(input.requestId)

        ? input.requestId

        : null;

    // Atomic insertion prevents duplicate
    // events for the same job and outcome.

    await UserActivity.updateOne(

      {
        _id: activityId,
      },

      {
        $setOnInsert: {

          userId:
            new Types.ObjectId(input.userId),

          activityType: successful

            ? ACTIVITY_TYPES.BACKGROUND_JOB_COMPLETED

            : ACTIVITY_TYPES.BACKGROUND_JOB_FAILED,

          outcome: successful

            ? ACTIVITY_OUTCOMES.SUCCESS

            : ACTIVITY_OUTCOMES.FAILURE,

          statusCode: null,

          durationMs,

          requestId,

          createdAt: new Date(),

        },
      },

      {

        upsert: true,

        runValidators: true,

      }

    );

  } catch (error) {

    // Concurrent insertion of the same
    // deterministic ID is safe.

    if (

      typeof error === "object" &&

      error !== null &&

      "code" in error &&

      error.code === 11000

    ) {
      return;
    }

    logApplicationError(

      error,

      "record_background_activity"

    );

  }

};
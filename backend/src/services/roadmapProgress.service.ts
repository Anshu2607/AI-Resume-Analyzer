import mongoose from "mongoose";

import Roadmap from "../models/roadmap.model.js";

import type {
  IRoadmap,
} from "../models/roadmap.model.js";

import {
  activityProgressSchema,
} from "../validators/roadmap.validator.js";

import {
  RoadmapError,
} from "./roadmap.service.js";

// =====================================
// CONFIGURATION
// =====================================

const MAX_UPDATE_ATTEMPTS = 3;

// =====================================
// VALIDATE MONGODB ID
// =====================================

const validateId = (
  id: string,
  label: string
): void => {

  if (!mongoose.isValidObjectId(id)) {

    throw new RoadmapError(
      `Invalid ${label}`,
      400
    );

  }

};

// =====================================
// RETRIEVE OWNED ROADMAP
// =====================================

const getOwnedRoadmap = async (

  userId: string,

  roadmapId: string

) => {

  validateId(userId, "user ID");

  validateId(roadmapId, "roadmap ID");

  const roadmap = await Roadmap.findOne({

    _id: roadmapId,

    userId,

  });

  if (!roadmap) {

    throw new RoadmapError(
      "Career roadmap not found",
      404
    );

  }

  return roadmap;

};

// =====================================
// RECALCULATE ROADMAP PROGRESS
// =====================================

const recalculateProgress = (
  roadmap: IRoadmap
): void => {

  const totalActivities =
    roadmap.activityProgress.length;

  const completedActivities =
    roadmap.activityProgress.filter(
      (activity) => activity.completed
    ).length;

  if (totalActivities === 0) {

    throw new RoadmapError(
      "Roadmap contains no learning activities",
      422
    );

  }

  roadmap.totalActivities =
    totalActivities;

  roadmap.completedActivities =
    completedActivities;

  roadmap.progressPercentage =
    completedActivities === totalActivities
      ? 100
      : Math.min(
          99,
          Math.round(
            (completedActivities /
              totalActivities) * 100
          )
        );

  // -------------------------------------
  // ALL ACTIVITIES COMPLETED
  // -------------------------------------

  if (
    completedActivities ===
    totalActivities
  ) {

    roadmap.status = "completed";

    roadmap.startedAt =
      roadmap.startedAt || new Date();

    roadmap.completedAt =
      roadmap.completedAt || new Date();

    return;

  }

  // -------------------------------------
  // SOME ACTIVITIES COMPLETED
  // -------------------------------------

  if (completedActivities > 0) {

    roadmap.status = "in_progress";

    roadmap.startedAt =
      roadmap.startedAt || new Date();

    roadmap.completedAt = null;

    return;

  }

  // -------------------------------------
  // NO ACTIVITIES COMPLETED
  // -------------------------------------

  roadmap.status = "not_started";

  roadmap.startedAt = null;

  roadmap.completedAt = null;

};

// =====================================
// HANDLE CONCURRENT UPDATE CONFLICTS
// =====================================

const isVersionConflict = (
  error: unknown
): boolean => {

  return (
    error instanceof
    mongoose.Error.VersionError
  );

};

// =====================================
// UPDATE LEARNING ACTIVITY PROGRESS
// =====================================

export const updateActivityProgress = async (

  userId: string,

  roadmapId: string,

  input: unknown

) => {

  const validation =
    activityProgressSchema.safeParse(
      input
    );

  if (!validation.success) {

    throw new RoadmapError(

      validation.error.issues[0]?.message ||

      "Invalid activity progress request",

      400

    );

  }

  const {

    week,

    activityIndex,

    completed,

  } = validation.data;

  for (

    let attempt = 1;

    attempt <= MAX_UPDATE_ATTEMPTS;

    attempt++

  ) {

    const roadmap =
      await getOwnedRoadmap(

        userId,

        roadmapId

      );

    if (roadmap.status === "archived") {

      throw new RoadmapError(

        "Restore the archived roadmap before updating progress",

        409

      );

    }

    // Verify the requested week exists.

    const milestone =
      roadmap.result.milestones.find(

        (item) =>
          item.week === week

      );

    if (!milestone) {

      throw new RoadmapError(
        "Roadmap week not found",
        404
      );

    }

    // Verify the requested activity exists.

    if (
      activityIndex >=
      milestone.activities.length
    ) {

      throw new RoadmapError(
        "Learning activity not found",
        404
      );

    }

    const activity =
      roadmap.activityProgress.find(

        (item) =>

          item.week === week &&

          item.activityIndex ===
            activityIndex

      );

    if (!activity) {

      throw new RoadmapError(

        "Activity progress record not found",

        409

      );

    }

    // Avoid unnecessary database writes
    // for repeated identical requests.

    if (
      activity.completed === completed
    ) {

      return roadmap;

    }

    activity.completed = completed;

    activity.completedAt =
      completed
        ? new Date()
        : null;

    // Recalculate overall roadmap progress.

    recalculateProgress(roadmap);

    try {

      await roadmap.save();

      console.log(
        "Roadmap activity progress updated"
      );

      console.log(
        "Week:",
        week
      );

      console.log(
        "Activity:",
        activityIndex
      );

      console.log(
        "Progress:",
        `${roadmap.progressPercentage}%`
      );

      console.log(
        "Status:",
        roadmap.status
      );

      return roadmap;

    } catch (error) {

      if (
        isVersionConflict(error)
      ) {

        if (
          attempt <
          MAX_UPDATE_ATTEMPTS
        ) {

          continue;

        }

        throw new RoadmapError(

          "Roadmap was updated concurrently. Please try again.",

          409

        );

      }

      throw error;

    }

  }

  throw new RoadmapError(

    "Unable to update roadmap progress",

    409

  );

};

// =====================================
// RESET ROADMAP PROGRESS
// =====================================

export const resetRoadmapProgress = async (

  userId: string,

  roadmapId: string

) => {

  const roadmap =
    await getOwnedRoadmap(

      userId,

      roadmapId

    );

  if (roadmap.status === "archived") {

    throw new RoadmapError(

      "Restore the archived roadmap before resetting progress",

      409

    );

  }

  for (
    const activity of roadmap.activityProgress
  ) {

    activity.completed = false;

    activity.completedAt = null;

  }

  recalculateProgress(roadmap);

  try {

    await roadmap.save();

  } catch (error) {

    if (
      isVersionConflict(error)
    ) {

      throw new RoadmapError(

        "Roadmap was updated concurrently. Please try again.",

        409

      );

    }

    throw error;

  }

  console.log(
    "Roadmap progress reset successfully"
  );

  return roadmap;

};

// =====================================
// ARCHIVE ROADMAP
// =====================================

export const archiveRoadmap = async (

  userId: string,

  roadmapId: string

) => {

  const roadmap =
    await getOwnedRoadmap(

      userId,

      roadmapId

    );

  if (roadmap.status === "archived") {

    return roadmap;

  }

  roadmap.status = "archived";

  try {

    await roadmap.save();

  } catch (error) {

    if (
      isVersionConflict(error)
    ) {

      throw new RoadmapError(

        "Roadmap was updated concurrently. Please try again.",

        409

      );

    }

    throw error;

  }

  console.log(
    "Career roadmap archived successfully"
  );

  return roadmap;

};

// =====================================
// RESTORE ARCHIVED ROADMAP
// =====================================

export const restoreRoadmap = async (

  userId: string,

  roadmapId: string

) => {

  const roadmap =
    await getOwnedRoadmap(

      userId,

      roadmapId

    );

  if (
    roadmap.status !== "archived"
  ) {

    return roadmap;

  }

  // Restore the status based on the
  // existing learning activity progress.

  recalculateProgress(roadmap);

  try {

    await roadmap.save();

  } catch (error) {

    if (
      isVersionConflict(error)
    ) {

      throw new RoadmapError(

        "Roadmap was updated concurrently. Please try again.",

        409

      );

    }

    throw error;

  }

  console.log(
    "Career roadmap restored successfully"
  );

  return roadmap;

};
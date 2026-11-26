import User from "../models/user.model.js";

import redis from "../config/redis.config.js";

import {
  ACTIVITY_CONFIG,
} from "../config/activity.config.js";

import {
  logApplicationError,
} from "../utils/logger.utils.js";

// =====================================
// PRESENCE CONFIGURATION
// =====================================

const PRESENCE_PREFIX =
  `${process.env.QUEUE_PREFIX || "careerlens"}:presence`;

const PRESENCE_TTL_SECONDS = Math.ceil(

  ACTIVITY_CONFIG.lastActiveUpdateIntervalMs
    / 1000

);

// =====================================
// GENERATE REDIS PRESENCE KEY
// =====================================

const getPresenceKey = (
  userId: string
): string => {

  return `${PRESENCE_PREFIX}:${userId}`;

};

// =====================================
// UPDATE LAST ACTIVE IN MONGODB
// =====================================

const updateLastActiveInDatabase = async (
  userId: string
): Promise<void> => {

  const now = new Date();

  const threshold = new Date(

    now.getTime() -
    ACTIVITY_CONFIG.lastActiveUpdateIntervalMs

  );

  await User.updateOne(

    {

      _id: userId,

      status: "active",

      $or: [

        {
          lastActiveAt: null,
        },

        {
          lastActiveAt: {
            $lt: threshold,
          },
        },

      ],

    },

    {

      $max: {

        lastActiveAt: now,

      },

    },

    {

      timestamps: false,

    }

  );

};

// =====================================
// TRACK USER PRESENCE
// =====================================

export const trackUserPresence = async (
  userId: string
): Promise<void> => {

  if (!ACTIVITY_CONFIG.enabled) {
    return;
  }

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
    return;
  }

  try {

    // Use MongoDB fallback when Redis
    // is temporarily unavailable.

    if (redis.status !== "ready") {

      await updateLastActiveInDatabase(
        userId
      );

      return;

    }

    const key = getPresenceKey(userId);

    let result: string | null;

    try {

      // Reserve one presence update
      // during the configured interval.

      result = await redis.set(

        key,

        "1",

        "EX",

        PRESENCE_TTL_SECONDS,

        "NX"

      );

    } catch {

      // Redis command failed.
      // Use conditional MongoDB update.

      await updateLastActiveInDatabase(
        userId
      );

      return;

    }

    // Presence was recently processed.

    if (result !== "OK") {
      return;
    }

    // Update the user's last active time.

    await updateLastActiveInDatabase(
      userId
    );

  } catch (error) {

    logApplicationError(
      error,
      "track_user_presence"
    );

  }

};
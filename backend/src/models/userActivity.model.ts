import mongoose, {
  Schema,
  Document,
  Types,
} from "mongoose";

import {

  ACTIVITY_TYPES,

  ACTIVITY_OUTCOMES,

  ACTIVITY_CONFIG,

} from "../config/activity.config.js";

import type {

  ActivityType,

  ActivityOutcome,

} from "../config/activity.config.js";

// =====================================
// USER ACTIVITY INTERFACE
// =====================================

export interface IUserActivity extends Document {

  userId: Types.ObjectId;

  activityType: ActivityType;

  outcome: ActivityOutcome;

  statusCode: number | null;

  durationMs: number | null;

  requestId: string | null;

  createdAt: Date;

}

// =====================================
// USER ACTIVITY SCHEMA
// =====================================

const userActivitySchema =
  new Schema<IUserActivity>(

    {

      // Registered user reference.

      userId: {

        type: Schema.Types.ObjectId,

        ref: "User",

        required: true,

        immutable: true,

      },

      // Feature or activity performed.

      activityType: {

        type: String,

        enum: Object.values(
          ACTIVITY_TYPES
        ),

        required: true,

        immutable: true,

      },

      // Activity result.

      outcome: {

        type: String,

        enum: Object.values(
          ACTIVITY_OUTCOMES
        ),

        required: true,

        immutable: true,

      },

      // HTTP response status.

      statusCode: {

        type: Number,

        min: 100,

        max: 599,

        default: null,

      },

      // Request processing duration.

      durationMs: {

        type: Number,

        min: 0,

        default: null,

      },

      // Request correlation identifier.

      requestId: {

        type: String,

        maxlength: 100,

        default: null,

      },

      // Activity occurrence timestamp.

      createdAt: {

        type: Date,

        default: Date.now,

        required: true,

        immutable: true,

      },

    },

    {

      versionKey: false,

      timestamps: false,

    }

  );

// =====================================
// DATABASE INDEXES
// =====================================

// Retrieve activity history of a user.

userActivitySchema.index({

  userId: 1,

  createdAt: -1,

});

// Retrieve feature usage statistics.

userActivitySchema.index({

  activityType: 1,

  createdAt: -1,

});

// Retrieve successful or failed activities.

userActivitySchema.index({

  outcome: 1,

  createdAt: -1,

});

// Automatically expire old activity logs.

userActivitySchema.index(

  {

    createdAt: 1,

  },

  {

    expireAfterSeconds:
      ACTIVITY_CONFIG.retentionSeconds,

  }

);

// =====================================
// USER ACTIVITY MODEL
// =====================================

const UserActivity =
  mongoose.model<IUserActivity>(

    "UserActivity",

    userActivitySchema

  );

export default UserActivity;
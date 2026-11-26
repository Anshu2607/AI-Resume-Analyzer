import mongoose, {
  Schema,
  Document,
} from "mongoose";

// =====================================
// USER TYPES
// =====================================

export type UserRole = "user" | "admin";

export type UserStatus = "active" | "suspended";

// =====================================
// USER INTERFACE
// =====================================

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  role: UserRole;
  status: UserStatus;

  sessionVersion: number;

  lastLoginAt: Date | null;
  lastActiveAt: Date | null;

  loginCount: number;

  suspendedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// USER SCHEMA
// =====================================

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      required: true,
    },

    // =================================
    // SESSION REVOCATION VERSION
    // =================================

    sessionVersion: {
      type: Number,
      default: 0,
      required: true,
      min: 0,

      validate: {
        validator: (value: number) =>
          Number.isSafeInteger(value),

        message: "Invalid session version",
      },
    },

    // =================================
    // USER ACTIVITY TRACKING
    // =================================

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

// =====================================
// DATABASE INDEXES
// =====================================

userSchema.index({ role: 1 });

userSchema.index({ status: 1 });

userSchema.index({ createdAt: -1 });

userSchema.index({ lastActiveAt: -1 });

// =====================================
// USER MODEL
// =====================================

const User = mongoose.model<IUser>(
  "User",
  userSchema
);

export default User;
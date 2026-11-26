import bcrypt from "bcryptjs";

import User from "../models/user.model.js";

import {
  generateToken,
} from "../utils/jwt.utils.js";

import type {
  RegisterInput,
  LoginInput,
} from "../validators/auth.validator.js";

// =====================================
// AUTHENTICATION ERROR
// =====================================

export class AuthError extends Error {

  constructor(
    message: string,
    public statusCode: number
  ) {

    super(message);

    this.name = "AuthError";

  }
}

// =====================================
// REGISTER NEW USER
// =====================================

export const registerUser = async (
  data: RegisterInput
) => {

  const {
    name,
    email,
    password,
  } = data;

  const normalizedEmail =
    email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {

    throw new AuthError(
      "Email is already registered",
      409
    );

  }

  const hashedPassword =
    await bcrypt.hash(password, 12);

  const now = new Date();

  try {

    const user = await User.create({

      name: name.trim(),

      email: normalizedEmail,

      password: hashedPassword,

      role: "user",

      status: "active",

      sessionVersion: 0,

      lastLoginAt: null,

      lastActiveAt: now,

      loginCount: 0,

      suspendedAt: null,

    });

    const token = generateToken({

      userId: user._id.toString(),

      role: "user",

      sessionVersion:
        user.sessionVersion,

    });

    return {

      user: {

        id: user._id.toString(),

        name: user.name,

        email: user.email,

        role: user.role,

        status: user.status,

        createdAt: user.createdAt,

        lastLoginAt: user.lastLoginAt,

        lastActiveAt: user.lastActiveAt,

        loginCount: user.loginCount,

      },

      token,

    };

  } catch (error) {

    if (

      typeof error === "object" &&

      error !== null &&

      "code" in error &&

      error.code === 11000

    ) {

      throw new AuthError(
        "Email is already registered",
        409
      );

    }

    throw error;

  }
};

// =====================================
// LOGIN REGULAR USER
// =====================================

export const loginUser = async (
  data: LoginInput
) => {

  const {
    email,
    password,
  } = data;

  const normalizedEmail =
    email.trim().toLowerCase();

  const user = await User.findOne({

    email: normalizedEmail,

    role: "user",

  }).select("+password");

  if (!user) {

    throw new AuthError(
      "Invalid email or password",
      401
    );

  }

  const isPasswordValid =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!isPasswordValid) {

    throw new AuthError(
      "Invalid email or password",
      401
    );

  }

  // ===================================
  // VERIFY ACCOUNT STATUS
  // ===================================

  if (user.status === "suspended") {

    throw new AuthError(
      "Your account has been suspended",
      403
    );

  }

  if (

    user.status !== undefined &&

    user.status !== "active"

  ) {

    throw new AuthError(
      "User account is unavailable",
      403
    );

  }

  if (user.role !== "user") {

    throw new AuthError(
      "Access denied",
      403
    );

  }

  const currentVersion =
    user.sessionVersion ?? 0;

  if (

    !Number.isSafeInteger(currentVersion) ||

    currentVersion < 0

  ) {

    throw new AuthError(
      "Invalid account session configuration",
      503
    );

  }

  // ===================================
  // ATOMIC LOGIN STATISTICS UPDATE
  // ===================================

  const now = new Date();

  const updatedUser =
    await User.findOneAndUpdate(

      {

        _id: user._id,

        role: "user",

        $and: [

          {
            $or: [

              { status: "active" },

              {
                status: {
                  $exists: false,
                },
              },

            ],
          },

          {
            $or: [

              {
                sessionVersion: currentVersion,
              },

              ...(currentVersion === 0
                ? [
                    {
                      sessionVersion: {
                        $exists: false,
                      },
                    },
                  ]
                : []),

            ],
          },

        ],

      },

      {

        $set: {

          status: "active",

          sessionVersion:
            currentVersion,

          lastLoginAt: now,

          lastActiveAt: now,

        },

        $inc: {

          loginCount: 1,

        },

      },

      {

        new: true,

        runValidators: true,

      }

    ).select("-password");

  if (!updatedUser) {

    throw new AuthError(

      "Account permissions or status changed. Please try again.",

      403

    );

  }

  // ===================================
  // GENERATE REGULAR USER JWT
  // ===================================

  const token = generateToken({

    userId: updatedUser._id.toString(),

    role: "user",

    sessionVersion:
      updatedUser.sessionVersion,

  });

  return {

    user: {

      id: updatedUser._id.toString(),

      name: updatedUser.name,

      email: updatedUser.email,

      role: updatedUser.role,

      status: updatedUser.status,

      createdAt: updatedUser.createdAt,

      lastLoginAt: updatedUser.lastLoginAt,

      lastActiveAt: updatedUser.lastActiveAt,

      loginCount: updatedUser.loginCount,

    },

    token,

  };
};
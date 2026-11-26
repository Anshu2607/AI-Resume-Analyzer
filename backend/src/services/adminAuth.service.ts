import bcrypt from "bcryptjs";

import User from "../models/user.model.js";

import AdminMfa from "../models/adminMfa.model.js";

import { AuthError } from "./auth.service.js";

import {
  generateAdminToken,
} from "../utils/jwt.utils.js";

import {
  ADMIN_AUTH_CONFIG,
} from "../config/adminAuth.config.js";

import {
  reserveAdminLoginAttempt,
  clearAdminLoginAttempts,
} from "./adminLoginProtection.service.js";

import type {
  AdminLoginInput,
} from "../validators/adminAuth.validator.js";

// =====================================
// ADMINISTRATOR CREDENTIAL VERIFICATION
// =====================================

export const verifyAdminCredentials = async (
  data: AdminLoginInput
) => {

  const email =
    data.email.trim().toLowerCase();

  const password =
    data.password;

  // Preserve account-level rate limiting.

  await reserveAdminLoginAttempt(email);

  if (

    password.length < 16 ||

    Buffer.byteLength(password, "utf8") > 72

  ) {

    throw new AuthError(
      "Invalid administrator credentials",
      401
    );

  }

  const admin = await User.findOne({

    email,

    role: "admin",

  }).select("+password");

  if (!admin) {

    throw new AuthError(
      "Invalid administrator credentials",
      401
    );

  }

  const isPasswordValid =
    await bcrypt.compare(
      password,
      admin.password
    );

  if (!isPasswordValid) {

    throw new AuthError(
      "Invalid administrator credentials",
      401
    );

  }

  if (admin.status !== "active") {

    throw new AuthError(
      "Administrator account is unavailable",
      403
    );

  }

  return {

    userId: admin._id.toString(),

    name: admin.name,

    email: admin.email,

    role: admin.role,

    status: admin.status,

  };
};

// =====================================
// COMPLETE MFA-VERIFIED ADMIN LOGIN
// =====================================

export const completeAdminLogin = async (
  userId: string
) => {

  const mfaEnabled = await AdminMfa.exists({

    userId,

    enabled: true,

  });

  if (!mfaEnabled) {

    throw new AuthError(
      "Multi-factor authentication is required",
      403
    );

  }

  const now = new Date();

  const admin = await User.findOneAndUpdate(

    {

      _id: userId,

      role: "admin",

      status: "active",

    },

    {

      $set: {

        lastLoginAt: now,

        lastActiveAt: now,

      },

      $inc: {

        loginCount: 1,

        // Initialize missing session versions
        // without changing existing versions.

        sessionVersion: 0,

      },

    },

    {

      new: true,

      runValidators: true,

    }

  ).select("-password");

  if (!admin) {

    throw new AuthError(
      "Administrator account is unavailable",
      403
    );

  }

  const sessionVersion =
    admin.sessionVersion ?? 0;

  if (

    !Number.isSafeInteger(sessionVersion) ||

    sessionVersion < 0

  ) {

    throw new AuthError(
      "Invalid administrator session configuration",
      503
    );

  }

  // ===================================
  // GENERATE VERSIONED ADMIN JWT
  // ===================================

  const token = generateAdminToken(

    admin._id.toString(),

    sessionVersion

  );

  // Reset account login attempts only
  // after successful MFA.

  await clearAdminLoginAttempts(
    admin.email
  );

  return {

    user: {

      id: admin._id.toString(),

      name: admin.name,

      email: admin.email,

      role: admin.role,

      status: admin.status,

      createdAt: admin.createdAt,

      lastLoginAt: admin.lastLoginAt,

      lastActiveAt: admin.lastActiveAt,

      loginCount: admin.loginCount,

    },

    token,

    tokenType: "Bearer",

    expiresIn:
      ADMIN_AUTH_CONFIG.session.expiresInSeconds,

    mfaVerified: true,

  };
};
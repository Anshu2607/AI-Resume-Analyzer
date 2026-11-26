import type {
  Request,
  Response,
  NextFunction,
} from "express";

import mongoose from "mongoose";

import User from "../models/user.model.js";

import {
  verifyToken,
} from "../utils/jwt.utils.js";

import type {
  TokenPayload,
} from "../utils/jwt.utils.js";

import {
  isSessionRevoked,
} from "../services/sessionRevocation.service.js";

import {
  attachAIUsageContext,
} from "./aiUsage.middleware.js";

export interface AuthenticatedRequest
  extends Request {

  user?: TokenPayload;

}

// =====================================
// AUTHENTICATION
// =====================================

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {

  const authorization =
    req.headers.authorization;

  if (

    !authorization ||

    !authorization.startsWith("Bearer ")

  ) {

    res.status(401).json({
      success: false,
      message: "Authentication required",
    });

    return;
  }

  const token =
    authorization.slice(7).trim();

  if (!token) {

    res.status(401).json({
      success: false,
      message: "Authentication required",
    });

    return;
  }

  let payload: TokenPayload;

  try {

    payload = verifyToken(token);

  } catch {

    res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please sign in again.",
    });

    return;
  }

  if (!mongoose.isValidObjectId(payload.userId)) {

    res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });

    return;
  }

  try {

    const user = await User.findById(
      payload.userId
    )
      .select("_id role status sessionVersion")
      .maxTimeMS(10000)
      .lean();

    if (!user) {

      res.status(401).json({
        success: false,
        message: "User account not found",
      });

      return;
    }

    // =================================
    // ACCOUNT STATUS VALIDATION
    // =================================

    if (user.status === "suspended") {

      res.status(403).json({
        success: false,
        message: "User account is suspended",
      });

      return;
    }

    if (

      user.status !== undefined &&

      user.status !== "active"

    ) {

      res.status(403).json({
        success: false,
        message: "User account is unavailable",
      });

      return;
    }

    // =================================
    // ROLE VALIDATION
    // =================================

    if (

      user.role !== "user" &&

      user.role !== "admin"

    ) {

      res.status(403).json({
        success: false,
        message: "Invalid account role",
      });

      return;
    }

    if (payload.role !== user.role) {

      res.status(401).json({
        success: false,
        message: "Account permissions have changed",
      });

      return;
    }

    // =================================
    // SESSION VERSION VALIDATION
    // =================================

    // Existing accounts without the new field
    // are treated as version zero.

    const currentVersion =

      user.sessionVersion === undefined

        ? 0

        : user.sessionVersion;

    if (

      !Number.isSafeInteger(currentVersion) ||

      currentVersion < 0 ||

      payload.sessionVersion !== currentVersion

    ) {

      res.status(401).json({
        success: false,
        message: "Your session has been revoked. Please sign in again.",
      });

      return;
    }

    // =================================
    // ADMINISTRATOR JWT REVOCATION
    // =================================

    if (payload.role === "admin") {

      if (

        payload.sessionType !== "admin" ||

        payload.mfaVerified !== true ||

        !payload.jti

      ) {

        res.status(401).json({
          success: false,
          message: "Invalid administrator session",
        });

        return;
      }

      const revoked =
        await isSessionRevoked(payload.jti);

      if (revoked) {

        res.status(401).json({
          success: false,
          message: "Administrator session has been revoked",
        });

        return;
      }

    }

    // =================================
    // ATTACH AUTHENTICATED USER
    // =================================

    req.user = {

      ...payload,

      userId: user._id.toString(),

      role: user.role,

    };

  } catch {

    res.status(503).json({
      success: false,
      message: "Authentication service unavailable",
    });

    return;
  }

  // Preserve AI usage attribution.

  attachAIUsageContext(req, res, next);
};

// =====================================
// ROLE-BASED AUTHORIZATION
// =====================================

export const authorize = (
  ...allowedRoles: TokenPayload["role"][]
) => {

  return (

    req: AuthenticatedRequest,

    res: Response,

    next: NextFunction

  ): void => {

    if (!req.user) {

      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    if (!allowedRoles.includes(req.user.role)) {

      res.status(403).json({
        success: false,
        message: "Access denied",
      });

      return;
    }

    next();
  };
};

export const requireAdmin =
  authorize("admin");
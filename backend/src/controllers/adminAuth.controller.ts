import type {
  Request,
  Response,
} from "express";

import User from "../models/user.model.js";

import {
  verifyAdminCredentials,
  completeAdminLogin,
} from "../services/adminAuth.service.js";

import {
  AuthError,
} from "../services/auth.service.js";

import {
  createAdminChallenge,
  reserveAdminChallengeAttempt,
  consumeAdminChallenge,
  AdminChallengeError,
} from "../services/adminChallenge.service.js";

import {
  getAdminMfaStatus,
  initializeAdminMfa,
  activateAdminMfa,
  verifyAdminMfaCode,
  AdminMfaError,
} from "../services/adminMfa.service.js";

import {
  adminLoginSchema,
  adminMfaSetupSchema,
  adminMfaActivateSchema,
  adminMfaVerifySchema,
} from "../validators/adminAuth.validator.js";

import {
  ADMIN_SECURITY_CONFIG,
} from "../config/adminSecurity.config.js";

// =====================================
// ADMIN AUTHENTICATION ERROR HANDLER
// =====================================

const handleAdminAuthError = (
  error: unknown,
  res: Response
): void => {

  if (
    error instanceof AuthError ||
    error instanceof AdminChallengeError ||
    error instanceof AdminMfaError
  ) {

    res.status(error.statusCode).json({

      success: false,

      message: error.message,

    });

    return;
  }

  res.status(500).json({

    success: false,

    message: "Administrator authentication failed",

  });

};

// =====================================
// MFA ENROLLMENT SECURITY GUARD
// =====================================

const requireMfaEnrollmentEnabled = (): void => {

  if (
    !ADMIN_SECURITY_CONFIG.mfaEnrollment.enabled
  ) {

    throw new AuthError(

      "Administrator MFA enrollment is disabled. Contact the platform operator.",

      403

    );

  }
};

// =====================================
// VERIFY ACTIVE ADMIN ACCOUNT
// =====================================

const requireActiveAdmin = async (
  userId: string
): Promise<void> => {

  const admin = await User.exists({

    _id: userId,

    role: "admin",

    status: "active",

  }).maxTimeMS(10000);

  if (!admin) {

    throw new AuthError(

      "Administrator account is unavailable",

      403

    );

  }
};

// =====================================
// ADMINISTRATOR LOGIN
// =====================================

export const adminLogin = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const validation =
      adminLoginSchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Invalid login input",

      });

      return;
    }

    // Verify credentials using IP-level
    // and account-level login protection.

    const admin =
      await verifyAdminCredentials(
        validation.data
      );

    const mfaStatus =
      await getAdminMfaStatus(
        admin.userId
      );

    // Block creation of new setup challenges
    // when administrator enrollment is disabled.

    if (!mfaStatus.enabled) {

      requireMfaEnrollmentEnabled();

    }

    const purpose = mfaStatus.enabled

      ? "mfa-login"

      : "mfa-setup";

    const challenge =
      await createAdminChallenge(

        admin.userId,

        purpose

      );

    res.status(200).json({

      success: true,

      message: mfaStatus.enabled

        ? "Authenticator verification required"

        : "Multi-factor authentication setup required",

      data: {

        mfaRequired: true,

        setupRequired: !mfaStatus.enabled,

        challengeToken:
          challenge.challengeToken,

        expiresIn:
          challenge.expiresIn,

      },

    });

  } catch (error) {

    handleAdminAuthError(error, res);

  }

};

// =====================================
// INITIALIZE MFA ENROLLMENT
// =====================================

export const setupAdminMfa = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    // Block enrollment even if an earlier
    // setup challenge is still valid.

    requireMfaEnrollmentEnabled();

    const validation =
      adminMfaSetupSchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Invalid MFA setup request",

      });

      return;
    }

    const { challengeToken } =
      validation.data;

    const challenge =
      await reserveAdminChallengeAttempt(

        challengeToken,

        "mfa-setup"

      );

    await requireActiveAdmin(
      challenge.userId
    );

    const result =
      await initializeAdminMfa(
        challenge.userId
      );

    res.status(200).json({

      success: true,

      message:
        "Scan the QR code using your authenticator application",

      data: result,

    });

  } catch (error) {

    handleAdminAuthError(error, res);

  }

};

// =====================================
// ACTIVATE MFA ENROLLMENT
// =====================================

export const activateMfa = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    // Prevent activation when enrollment
    // has been disabled by the operator.

    requireMfaEnrollmentEnabled();

    const validation =
      adminMfaActivateSchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Invalid MFA activation request",

      });

      return;
    }

    const {
      challengeToken,
      otp,
    } = validation.data;

    const challenge =
      await reserveAdminChallengeAttempt(

        challengeToken,

        "mfa-setup"

      );

    await requireActiveAdmin(
      challenge.userId
    );

    const result =
      await activateAdminMfa(

        challenge.userId,

        otp

      );

    await consumeAdminChallenge(

      challengeToken,

      challenge.userId,

      "mfa-setup"

    );

    res.status(200).json({

      success: true,

      message:
        "Multi-factor authentication enabled successfully. Please login again with a new authenticator code.",

      data: {

        enabled: result.enabled,

        verifiedAt: result.verifiedAt,

        loginRequired: true,

      },

    });

  } catch (error) {

    handleAdminAuthError(error, res);

  }

};

// =====================================
// VERIFY MFA AND GENERATE ADMIN JWT
// =====================================

export const verifyAdminMfa = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const validation =
      adminMfaVerifySchema.safeParse(req.body);

    if (!validation.success) {

      res.status(400).json({

        success: false,

        message: "Invalid MFA verification request",

      });

      return;
    }

    const {
      challengeToken,
      otp,
    } = validation.data;

    // Reserve authentication attempt.

    const challenge =
      await reserveAdminChallengeAttempt(

        challengeToken,

        "mfa-login"

      );

    // Prevent suspended or removed administrators
    // from completing authentication.

    await requireActiveAdmin(
      challenge.userId
    );

    // Verify OTP and prevent replay.

    await verifyAdminMfaCode(

      challenge.userId,

      otp

    );

    // Consume single-use challenge.

    await consumeAdminChallenge(

      challengeToken,

      challenge.userId,

      "mfa-login"

    );

    // Generate administrator JWT,
    // update login statistics and clear
    // account-level login attempts.

    const session =
      await completeAdminLogin(
        challenge.userId
      );

    // Return authenticated session.

    res.status(200).json({

      success: true,

      message: "Administrator login successful",

      data: session,

    });

  } catch (error) {

    handleAdminAuthError(error, res);

  }

};
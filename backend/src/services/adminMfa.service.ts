import mongoose from "mongoose";

import User from "../models/user.model.js";
import AdminMfa from "../models/adminMfa.model.js";

import {
  encryptSecret,
  decryptSecret,
} from "../utils/encryption.utils.js";

import {
  generateTotpSecret,
  generateTotpQRCode,
  verifyTotp,
} from "../utils/totp.utils.js";

// =====================================
// MFA ERROR
// =====================================

export class AdminMfaError extends Error {

  constructor(
    message: string,
    public readonly statusCode: number
  ) {

    super(message);

    this.name = "AdminMfaError";

  }

}

// =====================================
// ENCRYPTION CONTEXT
// =====================================

const getEncryptionContext = (
  userId: string
): string => {

  return `admin-mfa:${userId}`;

};

// =====================================
// VERIFY ADMINISTRATOR ACCOUNT
// =====================================

const getActiveAdmin = async (
  userId: string
) => {

  if (!mongoose.isValidObjectId(userId)) {

    throw new AdminMfaError(
      "Invalid administrator account",
      401
    );

  }

  const admin = await User.findOne({

    _id: userId,

    role: "admin",

    status: "active",

  }).select("_id name email role status");

  if (!admin) {

    throw new AdminMfaError(
      "Administrator account is unavailable",
      403
    );

  }

  return admin;

};

// =====================================
// CHECK MFA STATUS
// =====================================

export const getAdminMfaStatus = async (
  userId: string
) => {

  await getActiveAdmin(userId);

  const configuration =
    await AdminMfa.findOne({

      userId,

    }).select(
      "enabled verifiedAt lastUsedAt"
    ).lean();

  return {

    enabled:
      configuration?.enabled === true,

    verifiedAt:
      configuration?.verifiedAt ?? null,

    lastUsedAt:
      configuration?.lastUsedAt ?? null,

  };

};

// =====================================
// INITIALIZE MFA ENROLLMENT
// =====================================

export const initializeAdminMfa =
  async (userId: string) => {

    const admin =
      await getActiveAdmin(userId);

    let configuration =
      await AdminMfa.findOne({

        userId,

      }).select("+encryptedSecret");

    // Never replace an enabled MFA secret.

    if (configuration?.enabled) {

      throw new AdminMfaError(
        "Multi-factor authentication is already enabled",
        409
      );

    }

    // Generate configuration only if missing.

    if (!configuration) {

      const generatedSecret =
        generateTotpSecret();

      const encryptedSecret =
        encryptSecret(

          generatedSecret,

          getEncryptionContext(userId)

        );

      try {

        configuration =
          await AdminMfa.create({

            userId,

            encryptedSecret,

            enabled: false,

            verifiedAt: null,

            lastUsedAt: null,

            lastUsedTimeStep: null,

          });

      } catch (error) {

        // Handle concurrent enrollment requests.

        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === 11000
        ) {

          configuration =
            await AdminMfa.findOne({

              userId,

            }).select("+encryptedSecret");

        } else {

          throw error;

        }

      }

    }

    if (
      !configuration ||
      configuration.enabled
    ) {

      throw new AdminMfaError(
        "Unable to initialize MFA enrollment",
        409
      );

    }

    const secret = decryptSecret(

      configuration.encryptedSecret,

      getEncryptionContext(userId)

    );

    const qrCode =
      await generateTotpQRCode(

        admin.email,

        secret

      );

    return {

      enabled: false,

      qrCode,

      manualEntryKey: secret,

    };

  };

// =====================================
// VERIFY AND ACTIVATE MFA ENROLLMENT
// =====================================

export const activateAdminMfa = async (

  userId: string,

  otp: string

) => {

  await getActiveAdmin(userId);

  const configuration =
    await AdminMfa.findOne({

      userId,

      enabled: false,

    }).select(
      "+encryptedSecret +lastUsedTimeStep"
    );

  if (!configuration) {

    throw new AdminMfaError(
      "MFA enrollment is unavailable or already completed",
      409
    );

  }

  const secret = decryptSecret(

    configuration.encryptedSecret,

    getEncryptionContext(userId)

  );

  const verification =
    await verifyTotp(secret, otp);

  if (

    !verification.valid ||

    verification.timeStep === null

  ) {

    throw new AdminMfaError(
      "Invalid authenticator code",
      401
    );

  }

  const now = new Date();

  // Atomically activate enrollment.

  const result =
    await AdminMfa.updateOne(

      {

        _id: configuration._id,

        enabled: false,

        encryptedSecret:
          configuration.encryptedSecret,

      },

      {

        $set: {

          enabled: true,

          verifiedAt: now,

          lastUsedAt: now,

          lastUsedTimeStep:
            verification.timeStep,

        },

      }

    );

  if (result.modifiedCount !== 1) {

    throw new AdminMfaError(
      "MFA enrollment was already completed or modified",
      409
    );

  }

  return {

    enabled: true,

    verifiedAt: now,

  };

};

// =====================================
// VERIFY ADMINISTRATOR LOGIN OTP
// =====================================

export const verifyAdminMfaCode = async (

  userId: string,

  otp: string

): Promise<void> => {

  await getActiveAdmin(userId);

  const configuration =
    await AdminMfa.findOne({

      userId,

      enabled: true,

    }).select(
      "+encryptedSecret +lastUsedTimeStep"
    );

  if (!configuration) {

    throw new AdminMfaError(
      "Multi-factor authentication is not enabled",
      403
    );

  }

  const secret = decryptSecret(

    configuration.encryptedSecret,

    getEncryptionContext(userId)

  );

  const verification =
    await verifyTotp(secret, otp);

  if (

    !verification.valid ||

    verification.timeStep === null

  ) {

    throw new AdminMfaError(
      "Invalid authenticator code",
      401
    );

  }

  // ===================================
  // ATOMIC OTP REPLAY PREVENTION
  // ===================================

  const result =
    await AdminMfa.updateOne(

      {

        _id: configuration._id,

        enabled: true,

        encryptedSecret:
          configuration.encryptedSecret,

        $or: [

          {
            lastUsedTimeStep: null,
          },

          {
            lastUsedTimeStep: {

              $lt: verification.timeStep,

            },
          },

        ],

      },

      {

        $set: {

          lastUsedAt: new Date(),

          lastUsedTimeStep:
            verification.timeStep,

        },

      }

    );

  if (result.modifiedCount !== 1) {

    throw new AdminMfaError(
      "Authenticator code has already been used. Wait for a new code.",
      401
    );

  }

};
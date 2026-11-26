import {
  Buffer,
} from "node:buffer";

// =====================================
// PRODUCTION SECURITY VALIDATION
// =====================================

export const validateProductionSecurity =
  (): void => {

    const errors: string[] = [];

    const isProduction =
      process.env.NODE_ENV === "production";

    const jwtSecret =
      process.env.JWT_SECRET;

    const mfaEncryptionKey =
      process.env.ADMIN_MFA_ENCRYPTION_KEY;

    const mfaEnrollment =
      process.env.ADMIN_MFA_ENROLLMENT_ENABLED;

    // =================================
    // JWT SECRET VALIDATION
    // =================================

    if (!jwtSecret) {

      errors.push(
        "JWT_SECRET is required"
      );

    } else if (

      isProduction &&

      Buffer.byteLength(
        jwtSecret,
        "utf8"
      ) < 64

    ) {

      errors.push(
        "Production JWT_SECRET must contain at least 64 bytes"
      );

    }

    // =================================
    // ADMIN MFA ENCRYPTION KEY
    // =================================

    if (

      !mfaEncryptionKey ||

      !/^[a-fA-F0-9]{64}$/.test(
        mfaEncryptionKey
      )

    ) {

      errors.push(

        "ADMIN_MFA_ENCRYPTION_KEY must be a valid 32-byte hexadecimal key"

      );

    }

    // =================================
    // MFA ENROLLMENT CONFIGURATION
    // =================================

    if (

      mfaEnrollment !== undefined &&

      mfaEnrollment !== "true" &&

      mfaEnrollment !== "false"

    ) {

      errors.push(

        "ADMIN_MFA_ENROLLMENT_ENABLED must be true or false"

      );

    }

    if (

      isProduction &&

      mfaEnrollment === "true"

    ) {

      errors.push(

        "Administrator MFA enrollment must be disabled in production"

      );

    }

    // =================================
    // REDIS SECURITY
    // =================================

    if (

      isProduction &&

      !process.env.REDIS_PASSWORD?.trim()

    ) {

      errors.push(
        "Redis password is required in production"
      );

    }

    // =================================
    // AI QUOTA CONFIGURATION
    // =================================

    const quotaEnabled =
      process.env.AI_QUOTA_ENABLED;

    if (

      quotaEnabled !== undefined &&

      quotaEnabled !== "true" &&

      quotaEnabled !== "false"

    ) {

      errors.push(

        "AI_QUOTA_ENABLED must be true or false"

      );

    }

    if (

      isProduction &&

      quotaEnabled === "false"

    ) {

      errors.push(

        "AI usage quotas must remain enabled in production"

      );

    }

    // =================================
    // AI USAGE TRACKING
    // =================================

    const trackingEnabled =
      process.env.AI_USAGE_TRACKING_ENABLED;

    if (

      trackingEnabled !== undefined &&

      trackingEnabled !== "true" &&

      trackingEnabled !== "false"

    ) {

      errors.push(

        "AI_USAGE_TRACKING_ENABLED must be true or false"

      );

    }

    // =================================
    // VALIDATION RESULT
    // =================================

    if (errors.length > 0) {

      throw new Error(

        "Security configuration validation failed:\n" +

        errors
          .map((error) => `- ${error}`)
          .join("\n")

      );

    }

    console.log(

      "Production security configuration validated successfully"

    );

  };
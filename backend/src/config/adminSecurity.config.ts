export const ADMIN_SECURITY_CONFIG = {

  mfaEnrollment: {

    enabled:
      process.env.ADMIN_MFA_ENROLLMENT_ENABLED === "true",

  },

  accountLoginLimit: {

    keyPrefix:
      "careerlens:admin:login-attempts:v1",

    maxAttempts: 5,

    windowSeconds: 15 * 60,

  },

  session: {

    keyPrefix:
      "careerlens:admin:revoked-session:v1",

    maxDurationSeconds: 30 * 60,

  },

} as const;
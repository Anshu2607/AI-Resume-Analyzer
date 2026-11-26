// =====================================
// ADMIN AUTHENTICATION CONFIGURATION
// =====================================

export const ADMIN_AUTH_CONFIG = {

  // Administrator login rate limits.

  loginRateLimit: {

    windowMs: 15 * 60 * 1000,

    max: 5,

  },

  // MFA verification rate limits.

  mfaRateLimit: {

    windowMs: 5 * 60 * 1000,

    max: 5,

  },

  // Temporary authentication challenge.

  challenge: {

    prefix: "careerlens:admin:mfa",

    ttlSeconds: 300,

    tokenBytes: 32,

    maxAttempts: 5,

  },

  // Authenticator configuration.

  totp: {

    issuer: "CareerLens AI",

    digits: 6,

    period: 30,

  },

  // Administrator session configuration.

  session: {

    expiresInSeconds: 1800,

  },

} as const;
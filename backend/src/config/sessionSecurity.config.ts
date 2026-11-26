export const SESSION_SECURITY_CONFIG = {

  version: {

    initialVersion: 0,

    claimName: "sessionVersion",

  },

  revocation: {

    keyPrefix:
      "careerlens:session:revoked:v1",

    adminSessionDurationSeconds:
      30 * 60,

  },

  legacyTokens: {

    allow: false,

  },

} as const;
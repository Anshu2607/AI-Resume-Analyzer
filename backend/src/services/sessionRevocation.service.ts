import redis from "../config/redis.config.js";

import {
  SESSION_SECURITY_CONFIG,
} from "../config/sessionSecurity.config.js";

import type {
  TokenPayload,
} from "../utils/jwt.utils.js";

export class SessionRevocationError extends Error {

  constructor(
    message: string,
    public statusCode: number
  ) {

    super(message);

    this.name = "SessionRevocationError";

  }
}

const UUID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// =====================================
// REDIS SESSION KEY
// =====================================

const getSessionKey = (
  jti: string
): string => {

  if (!UUID_PATTERN.test(jti)) {

    throw new SessionRevocationError(
      "Invalid session identifier",
      401
    );

  }

  return (

    SESSION_SECURITY_CONFIG.revocation.keyPrefix +

    ":" +

    jti

  );
};

// =====================================
// VERIFY SESSION REVOCATION STATUS
// =====================================

export const isSessionRevoked = async (
  jti: string
): Promise<boolean> => {

  if (redis.status !== "ready") {

    throw new SessionRevocationError(
      "Session verification service unavailable",
      503
    );

  }

  const key = getSessionKey(jti);

  try {

    const result = await redis.exists(key);

    return result > 0;

  } catch {

    throw new SessionRevocationError(
      "Session verification service unavailable",
      503
    );

  }
};

// =====================================
// REVOKE ADMINISTRATOR SESSION
// =====================================

export const revokeAdminSession = async (
  payload: TokenPayload
): Promise<void> => {

  if (

    payload.role !== "admin" ||

    payload.sessionType !== "admin" ||

    payload.mfaVerified !== true ||

    !payload.jti ||

    typeof payload.exp !== "number"

  ) {

    throw new SessionRevocationError(
      "Invalid administrator session",
      401
    );

  }

  const remainingSeconds =

    payload.exp -

    Math.floor(Date.now() / 1000);

  // Expired sessions cannot be reused.

  if (remainingSeconds <= 0) {
    return;
  }

  if (

    remainingSeconds >

    SESSION_SECURITY_CONFIG.revocation
      .adminSessionDurationSeconds

  ) {

    throw new SessionRevocationError(
      "Invalid administrator session duration",
      401
    );

  }

  if (redis.status !== "ready") {

    throw new SessionRevocationError(
      "Session revocation service unavailable",
      503
    );

  }

  const key = getSessionKey(payload.jti);

  try {

    await redis.set(

      key,

      "1",

      "EX",

      remainingSeconds

    );

  } catch {

    throw new SessionRevocationError(
      "Unable to revoke administrator session",
      503
    );

  }
};
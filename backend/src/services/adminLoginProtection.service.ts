import { createHash } from "node:crypto";

import redis from "../config/redis.config.js";

import {
  ADMIN_SECURITY_CONFIG,
} from "../config/adminSecurity.config.js";

import { AuthError } from "./auth.service.js";

// =====================================
// ATOMIC LOGIN ATTEMPT RESERVATION
// =====================================

const RESERVE_LOGIN_ATTEMPT_SCRIPT = `
  local key = KEYS[1]
  local maxAttempts = tonumber(ARGV[1])
  local windowSeconds = tonumber(ARGV[2])

  local attempts = tonumber(
    redis.call("GET", key) or "0"
  )

  if attempts >= maxAttempts then
    return 0
  end

  local updated = redis.call("INCR", key)

  if updated == 1 then
    redis.call("EXPIRE", key, windowSeconds)
  elseif redis.call("TTL", key) < 0 then
    redis.call("EXPIRE", key, windowSeconds)
  end

  return 1
`;

// =====================================
// GENERATE SAFE REDIS KEY
// =====================================

const getLoginAttemptKey = (
  email: string
): string => {

  const normalizedEmail =
    email.trim().toLowerCase();

  const identifier = createHash("sha256")
    .update(normalizedEmail)
    .digest("hex");

  return (
    ADMIN_SECURITY_CONFIG.accountLoginLimit.keyPrefix +
    ":" +
    identifier
  );
};

// =====================================
// RESERVE LOGIN ATTEMPT
// =====================================

export const reserveAdminLoginAttempt = async (
  email: string
): Promise<void> => {

  if (redis.status !== "ready") {

    throw new AuthError(
      "Administrator authentication service unavailable",
      503
    );

  }

  const key = getLoginAttemptKey(email);

  let result: unknown;

  try {

    result = await redis.eval(

      RESERVE_LOGIN_ATTEMPT_SCRIPT,

      1,

      key,

      String(
        ADMIN_SECURITY_CONFIG.accountLoginLimit.maxAttempts
      ),

      String(
        ADMIN_SECURITY_CONFIG.accountLoginLimit.windowSeconds
      )

    );

  } catch {

    throw new AuthError(
      "Administrator authentication service unavailable",
      503
    );

  }

  if (Number(result) !== 1) {

    throw new AuthError(
      "Too many administrator login attempts. Please try again later.",
      429
    );

  }
};

// =====================================
// CLEAR ATTEMPTS AFTER SUCCESSFUL MFA
// =====================================

export const clearAdminLoginAttempts = async (
  email: string
): Promise<void> => {

  if (redis.status !== "ready") {
    return;
  }

  try {

    await redis.del(
      getLoginAttemptKey(email)
    );

  } catch {

    // The counter will expire automatically.
    // Do not invalidate an otherwise successful login.

  }
};
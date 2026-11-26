import {
  randomBytes,
  createHash,
} from "node:crypto";

import redis from "../config/redis.config.js";

import {
  ADMIN_AUTH_CONFIG,
} from "../config/adminAuth.config.js";

// =====================================
// CHALLENGE TYPES
// =====================================

export type AdminChallengePurpose =
  | "mfa-login"
  | "mfa-setup";

export interface AdminChallenge {

  userId: string;

  purpose: AdminChallengePurpose;

  attempts: number;

  createdAt: number;

}

// =====================================
// CHALLENGE ERROR
// =====================================

export class AdminChallengeError extends Error {

  constructor(
    message: string,
    public readonly statusCode: number
  ) {

    super(message);

    this.name = "AdminChallengeError";

  }

}

// =====================================
// GENERATE REDIS KEY
// =====================================

const getChallengeKey = (
  token: string
): string => {

  const hash = createHash("sha256")
    .update(token)
    .digest("hex");

  return `${ADMIN_AUTH_CONFIG.challenge.prefix}:${hash}`;

};

// =====================================
// VALIDATE TOKEN FORMAT
// =====================================

const isValidToken = (
  token: string
): boolean => {

  return /^[a-f0-9]{64}$/.test(token);

};

// =====================================
// CHECK REDIS AVAILABILITY
// =====================================

const ensureRedisAvailable = (): void => {

  if (redis.status !== "ready") {

    throw new AdminChallengeError(
      "Authentication service temporarily unavailable",
      503
    );

  }

};

// =====================================
// CREATE AUTHENTICATION CHALLENGE
// =====================================

export const createAdminChallenge = async (

  userId: string,

  purpose: AdminChallengePurpose

) => {

  ensureRedisAvailable();

  const token = randomBytes(
    ADMIN_AUTH_CONFIG.challenge.tokenBytes
  ).toString("hex");

  const challenge: AdminChallenge = {

    userId,

    purpose,

    attempts: 0,

    createdAt: Date.now(),

  };

  const result = await redis.set(

    getChallengeKey(token),

    JSON.stringify(challenge),

    "EX",

    ADMIN_AUTH_CONFIG.challenge.ttlSeconds,

    "NX"

  );

  if (result !== "OK") {

    throw new AdminChallengeError(
      "Unable to create authentication challenge",
      503
    );

  }

  return {

    challengeToken: token,

    expiresIn:
      ADMIN_AUTH_CONFIG.challenge.ttlSeconds,

  };

};

// =====================================
// RESERVE MFA VERIFICATION ATTEMPT
// =====================================

const reserveAttemptScript = `

  local value = redis.call("GET", KEYS[1])

  if not value then
    return false
  end

  local challenge = cjson.decode(value)

  if challenge.purpose ~= ARGV[1] then
    return false
  end

  local maxAttempts = tonumber(ARGV[2])

  if challenge.attempts >= maxAttempts then
    return false
  end

  challenge.attempts = challenge.attempts + 1

  local updated = cjson.encode(challenge)

  redis.call(
    "SET",
    KEYS[1],
    updated,
    "KEEPTTL"
  )

  return updated

`;

// =====================================
// RESERVE AND RETRIEVE CHALLENGE
// =====================================

export const reserveAdminChallengeAttempt =
  async (

    token: string,

    purpose: AdminChallengePurpose

  ): Promise<AdminChallenge> => {

    ensureRedisAvailable();

    if (!isValidToken(token)) {

      throw new AdminChallengeError(
        "Invalid or expired authentication challenge",
        401
      );

    }

    const result = await redis.eval(

      reserveAttemptScript,

      1,

      getChallengeKey(token),

      purpose,

      ADMIN_AUTH_CONFIG.challenge.maxAttempts

    );

    if (typeof result !== "string") {

      throw new AdminChallengeError(
        "Authentication challenge expired, invalid or attempt limit reached",
        401
      );

    }

    return JSON.parse(result) as AdminChallenge;

  };

// =====================================
// ATOMIC CHALLENGE CONSUMPTION
// =====================================

const consumeChallengeScript = `

  local value = redis.call("GET", KEYS[1])

  if not value then
    return 0
  end

  local challenge = cjson.decode(value)

  if challenge.userId ~= ARGV[1] then
    return 0
  end

  if challenge.purpose ~= ARGV[2] then
    return 0
  end

  redis.call("DEL", KEYS[1])

  return 1

`;

// =====================================
// CONSUME SUCCESSFUL CHALLENGE
// =====================================

export const consumeAdminChallenge = async (

  token: string,

  userId: string,

  purpose: AdminChallengePurpose

): Promise<void> => {

  ensureRedisAvailable();

  if (!isValidToken(token)) {

    throw new AdminChallengeError(
      "Invalid authentication challenge",
      401
    );

  }

  const result = await redis.eval(

    consumeChallengeScript,

    1,

    getChallengeKey(token),

    userId,

    purpose

  );

  if (result !== 1) {

    throw new AdminChallengeError(
      "Authentication challenge expired or already used",
      401
    );

  }

};

// =====================================
// REVOKE AUTHENTICATION CHALLENGE
// =====================================

export const revokeAdminChallenge = async (

  token: string

): Promise<void> => {

  ensureRedisAvailable();

  if (!isValidToken(token)) {

    return;

  }

  await redis.del(

    getChallengeKey(token)

  );

};
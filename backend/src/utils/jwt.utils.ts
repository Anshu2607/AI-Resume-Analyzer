import jwt from "jsonwebtoken";

import type {
  SignOptions,
} from "jsonwebtoken";

import {
  randomUUID,
} from "node:crypto";

import {
  ADMIN_AUTH_CONFIG,
} from "../config/adminAuth.config.js";

// =====================================
// TOKEN PAYLOAD
// =====================================

export interface TokenPayload {
  userId: string;
  role: "user" | "admin";

  sessionType?: "user" | "admin";

  mfaVerified?: boolean;

  sessionVersion: number;

  jti?: string;

  iat?: number;

  exp?: number;
}

// =====================================
// JWT CONFIGURATION
// =====================================

const JWT_ISSUER = "careerlens-ai";

const USER_AUDIENCE = "careerlens-users";

const ADMIN_AUDIENCE = "careerlens-admins";

const OBJECT_ID_PATTERN =
  /^[a-fA-F0-9]{24}$/;

const UUID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// =====================================
// RETRIEVE JWT SECRET
// =====================================

const getJWTSecret = (): string => {

  const secret = process.env.JWT_SECRET;

  if (!secret) {

    throw new Error(
      "JWT_SECRET is not configured"
    );

  }

  return secret;
};

// =====================================
// VALIDATE SESSION VERSION
// =====================================

const validateSessionVersion = (
  version: unknown
): version is number => {

  return (

    typeof version === "number" &&

    Number.isSafeInteger(version) &&

    version >= 0

  );
};

// =====================================
// VALIDATE TOKEN GENERATION INPUT
// =====================================

const validateTokenInput = (
  userId: string,
  sessionVersion: number
): void => {

  if (
    !OBJECT_ID_PATTERN.test(userId) ||
    !validateSessionVersion(sessionVersion)
  ) {

    throw new Error(
      "Invalid token generation input"
    );

  }
};

// =====================================
// GENERATE REGULAR USER TOKEN
// =====================================

export const generateToken = (
  payload: TokenPayload
): string => {

  if (payload.role !== "user") {

    throw new Error(
      "Administrator tokens require MFA verification"
    );

  }

  validateTokenInput(
    payload.userId,
    payload.sessionVersion
  );

  const options: SignOptions = {

    algorithm: "HS256",

    expiresIn: (
      process.env.JWT_EXPIRES_IN || "1d"
    ) as SignOptions["expiresIn"],

    issuer: JWT_ISSUER,

    audience: USER_AUDIENCE,

    jwtid: randomUUID(),

  };

  return jwt.sign(

    {
      userId: payload.userId,

      role: "user",

      sessionType: "user",

      mfaVerified: false,

      sessionVersion:
        payload.sessionVersion,
    },

    getJWTSecret(),

    options

  );
};

// =====================================
// GENERATE MFA-VERIFIED ADMIN TOKEN
// =====================================

export const generateAdminToken = (
  userId: string,
  sessionVersion: number
): string => {

  validateTokenInput(
    userId,
    sessionVersion
  );

  const options: SignOptions = {

    algorithm: "HS256",

    expiresIn:
      ADMIN_AUTH_CONFIG.session.expiresInSeconds,

    issuer: JWT_ISSUER,

    audience: ADMIN_AUDIENCE,

    jwtid: randomUUID(),

  };

  return jwt.sign(

    {
      userId,

      role: "admin",

      sessionType: "admin",

      mfaVerified: true,

      sessionVersion,
    },

    getJWTSecret(),

    options

  );
};

// =====================================
// VERIFY JWT TOKEN
// =====================================

export const verifyToken = (
  token: string
): TokenPayload => {

  const decoded = jwt.verify(

    token,

    getJWTSecret(),

    {
      algorithms: ["HS256"],

      issuer: JWT_ISSUER,

      audience: [
        USER_AUDIENCE,
        ADMIN_AUDIENCE,
      ],
    }

  );

  // ===================================
  // VALIDATE COMMON CLAIMS
  // ===================================

  if (

    typeof decoded === "string" ||

    typeof decoded.userId !== "string" ||

    !OBJECT_ID_PATTERN.test(decoded.userId) ||

    !["user", "admin"].includes(decoded.role) ||

    typeof decoded.exp !== "number" ||

    typeof decoded.iat !== "number" ||

    !Number.isSafeInteger(decoded.exp) ||

    !Number.isSafeInteger(decoded.iat) ||

    decoded.exp <= decoded.iat ||

    decoded.iat >
      Math.floor(Date.now() / 1000) + 5 ||

    typeof decoded.jti !== "string" ||

    !UUID_PATTERN.test(decoded.jti) ||

    !validateSessionVersion(
      decoded.sessionVersion
    )

  ) {

    throw new Error(
      "Invalid token payload"
    );

  }

  // ===================================
  // VERIFY ADMINISTRATOR TOKEN
  // ===================================

  if (decoded.role === "admin") {

    if (

      decoded.aud !== ADMIN_AUDIENCE ||

      decoded.sessionType !== "admin" ||

      decoded.mfaVerified !== true ||

      decoded.exp - decoded.iat >
        ADMIN_AUTH_CONFIG.session.expiresInSeconds

    ) {

      throw new Error(
        "MFA-verified administrator session required"
      );

    }

    return {

      userId: decoded.userId,

      role: "admin",

      sessionType: "admin",

      mfaVerified: true,

      sessionVersion:
        decoded.sessionVersion,

      jti: decoded.jti,

      iat: decoded.iat,

      exp: decoded.exp,

    };
  }

  // ===================================
  // VERIFY REGULAR USER TOKEN
  // ===================================

  if (

    decoded.aud !== USER_AUDIENCE ||

    decoded.sessionType !== "user" ||

    decoded.mfaVerified !== false

  ) {

    throw new Error(
      "Invalid user session"
    );

  }

  return {

    userId: decoded.userId,

    role: "user",

    sessionType: "user",

    mfaVerified: false,

    sessionVersion:
      decoded.sessionVersion,

    jti: decoded.jti,

    iat: decoded.iat,

    exp: decoded.exp,

  };
};
import dotenv from "dotenv";

import {
  DEPLOYMENT_CONFIG,
  isAllowedDeploymentOrigin,
} from "./deployment.config.js";

dotenv.config();

// =====================================
// ENVIRONMENT CONFIGURATION
// =====================================

const isProduction =
  DEPLOYMENT_CONFIG.isProduction;

// =====================================
// ALLOWED CORS ORIGINS
// =====================================

const configuredOrigins = (
  process.env.CLIENT_URL || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (
  isProduction &&
  configuredOrigins.length === 0
) {
  throw new Error(
    "CLIENT_URL must be configured in production"
  );
}

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,

    ...(!isProduction &&
      !DEPLOYMENT_CONFIG.isLocalDocker
      ? [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]
      : []),
  ])
);

// =====================================
// VALIDATE ALLOWED ORIGINS
// =====================================

for (const origin of allowedOrigins) {

  if (!isAllowedDeploymentOrigin(origin)) {

    throw new Error(
      "Invalid CORS origin for the selected deployment mode"
    );

  }
}

// =====================================
// CENTRAL SECURITY CONFIGURATION
// =====================================

export const SECURITY_CONFIG = {
  isProduction,

  requiresHTTPS:
    DEPLOYMENT_CONFIG.requiresHTTPS,

  cors: {
    allowedOrigins,

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Request-ID",
    ],

    exposedHeaders: [
      "RateLimit",
      "RateLimit-Policy",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
      "Idempotency-Replayed",
      "X-Request-ID",
    ],

    maxAge: 600,
  },

  requestLimits: {
    json: "1mb",

    urlencoded: "1mb",

    parameterLimit: 100,

    fileUploadBytes: 5 * 1024 * 1024,
  },

  rateLimits: {
    global: {
      windowMs: 15 * 60 * 1000,
      max: 300,
    },

    authentication: {
      windowMs: 15 * 60 * 1000,
      max: 20,
    },

    registration: {
      windowMs: 60 * 60 * 1000,
      max: 10,
    },
  },

  headers: {
    hstsMaxAge: 31536000,
  },
} as const;
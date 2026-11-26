import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

// =====================================
// ENVIRONMENT CONFIGURATION
// =====================================

const isProduction =
  process.env.NODE_ENV === "production";

const isTest =
  process.env.NODE_ENV === "test";

// =====================================
// LOG LEVEL CONFIGURATION
// =====================================

const allowedLogLevels = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
];

const configuredLevel =
  process.env.LOG_LEVEL || "info";

const logLevel = isTest
  ? "silent"
  : allowedLogLevels.includes(configuredLevel)
    ? configuredLevel
    : "info";

// =====================================
// CENTRALIZED LOGGER
// =====================================

export const logger = pino({
  level: logLevel,

  base: {
    service: "careerlens-ai-backend",

    environment:
      process.env.NODE_ENV || "development",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Prevent sensitive fields from appearing
  // in structured application logs.

  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "apiKey",
      "secret",

      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",

      "req.body",
      "res.body",

      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.apiKey",
      "*.secret",
    ],

    censor: "[REDACTED]",
  },

  serializers: {
    err: (error: unknown) => ({
      name:
        error instanceof Error
          ? error.name
          : "UnknownError",
    }),
  },

  // Human-readable local logs.
  // Structured JSON logs in production.

  ...(!isProduction && !isTest
    ? {
        transport: {
          target: "pino-pretty",

          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            singleLine: true,
          },
        },
      }
    : {}),
});

export default logger;
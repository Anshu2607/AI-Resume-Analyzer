import type {
  Request,
  Response,
} from "express";

import {
  logger,
} from "../config/logger.config.js";

// =====================================
// REQUEST CORRELATION
// =====================================

export const getRequestId = (
  res: Response
): string => {

  const requestId =
    res.locals.requestId;

  return typeof requestId === "string"
    ? requestId
    : "unknown";
};

// =====================================
// REQUEST-SPECIFIC LOGGER
// =====================================

export const getRequestLogger = (
  req: Request
) => {

  return req.log || logger;
};

// =====================================
// APPLICATION ERROR LOGGING
// =====================================

export const logApplicationError = (
  error: unknown,
  operation: string,
  requestId?: string
): void => {

  logger.error(
    {
      operation,

      requestId,

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",
    },

    "Application operation failed"
  );
};

// =====================================
// SECURITY EVENT TYPES
// =====================================

export type SecurityEvent =
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_INPUT"
  | "PROMPT_INJECTION_DETECTED"
  | "CORS_REJECTED";

// =====================================
// SECURITY EVENT LOGGING
// =====================================

export const logSecurityEvent = (
  event: SecurityEvent,
  requestId?: string
): void => {

  logger.warn(
    {
      category: "security",

      event,

      requestId,
    },

    "Security event detected"
  );
};

// =====================================
// PERFORMANCE LOGGING
// =====================================

export const logPerformance = (
  operation: string,
  durationMs: number,
  requestId?: string
): void => {

  logger.info(
    {
      category: "performance",

      operation,

      durationMs,

      requestId,
    },

    "Operation performance recorded"
  );
};
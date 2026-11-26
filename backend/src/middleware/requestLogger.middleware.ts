import { randomUUID } from "node:crypto";

import {
  pinoHttp,
} from "pino-http";

import type {
  Options,
} from "pino-http";

import type {
  RequestHandler,
} from "express";

import {
  logger,
} from "../config/logger.config.js";

// =====================================
// HTTP LOGGER CONFIGURATION
// =====================================

const loggerOptions: Options = {

  logger,

  // Generate a trusted server-side request ID.

  genReqId: (_req, res) => {

    const requestId = randomUUID();

    res.setHeader(
      "X-Request-ID",
      requestId
    );

    return requestId;
  },

  // ===================================
  // AUTOMATIC REQUEST LOGGING
  // ===================================

  autoLogging: {

    ignore: (req) => {

      const path =
        req.url?.split("?")[0];

      return path === "/api/v1/health";
    },
  },

  // ===================================
  // HTTP LOG LEVEL
  // ===================================

  customLogLevel: (_req, res, error) => {

    if (error || res.statusCode >= 500) {
      return "error";
    }

    if (res.statusCode >= 400) {
      return "warn";
    }

    return "info";
  },

  // ===================================
  // SAFE SERIALIZATION
  // ===================================

  wrapSerializers: false,

  serializers: {

    req: (req) => ({

      id: req.id,

      method: req.method,

    }),

    res: (res) => ({

      statusCode: res.statusCode,

    }),

    err: (error) => ({

      name:
        error instanceof Error
          ? error.name
          : "UnknownError",

    }),
  },

  // ===================================
  // CUSTOM LOG MESSAGES
  // ===================================

  customSuccessMessage: (_req, res) => {

    return `HTTP request completed with status ${res.statusCode}`;

  },

  customErrorMessage: (_req, res) => {

    return `HTTP request failed with status ${res.statusCode}`;

  },
};

// =====================================
// INITIALIZE HTTP LOGGER
// =====================================

export const requestLogger =
  pinoHttp(loggerOptions);

// =====================================
// REQUEST CORRELATION MIDDLEWARE
// =====================================

export const requestCorrelation:
  RequestHandler = (req, res, next) => {

    const requestId = res.getHeader(
      "X-Request-ID"
    );

    res.locals.requestId =
      typeof requestId === "string"
        ? requestId
        : String(req.id);

    next();
  };
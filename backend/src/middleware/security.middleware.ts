import helmet from "helmet";
import cors from "cors";

import type {
  CorsOptions,
} from "cors";

import type {
  RequestHandler,
} from "express";

import {
  SECURITY_CONFIG,
} from "../config/security.config.js";

// =====================================
// SECURITY ERROR
// =====================================

export class SecurityError extends Error {

  constructor(
    message: string,
    public readonly statusCode: number
  ) {

    super(message);

    this.name = "SecurityError";
  }
}

// =====================================
// HELMET SECURITY HEADERS
// =====================================

export const securityHeaders = helmet({

  contentSecurityPolicy: {

    directives: {

      defaultSrc: ["'none'"],

      baseUri: ["'none'"],

      frameAncestors: ["'none'"],

      formAction: ["'none'"],

      objectSrc: ["'none'"],

      upgradeInsecureRequests:
        SECURITY_CONFIG.requiresHTTPS
          ? []
          : null,
    },
  },

  // Enable HSTS only when the deployment
  // requires HTTPS.

  strictTransportSecurity:
    SECURITY_CONFIG.requiresHTTPS
      ? {
          maxAge:
            SECURITY_CONFIG.headers.hstsMaxAge,

          includeSubDomains: true,

          preload: false,
        }
      : false,

  frameguard: {
    action: "deny",
  },

  noSniff: true,

  hidePoweredBy: true,

  referrerPolicy: {
    policy: "no-referrer",
  },

  crossOriginOpenerPolicy: {
    policy: "same-origin",
  },

  crossOriginResourcePolicy: {
    policy: "same-origin",
  },

  crossOriginEmbedderPolicy: false,
});

// =====================================
// STRICT CORS CONFIGURATION
// =====================================

const corsOptions: CorsOptions = {

  origin: (origin, callback) => {

    // Allow server-to-server requests.

    if (!origin) {

      callback(null, true);

      return;
    }

    if (
      SECURITY_CONFIG.cors.allowedOrigins
        .includes(origin)
    ) {

      callback(null, true);

      return;
    }

    callback(
      new SecurityError(
        "Origin is not allowed",
        403
      )
    );

  },

  credentials:
    SECURITY_CONFIG.cors.credentials,

  methods: [
    ...SECURITY_CONFIG.cors.methods,
  ],

  allowedHeaders: [
    ...SECURITY_CONFIG.cors.allowedHeaders,
  ],

  exposedHeaders: [
    ...SECURITY_CONFIG.cors.exposedHeaders,
  ],

  maxAge:
    SECURITY_CONFIG.cors.maxAge,

  optionsSuccessStatus: 204,
};

export const securityCors =
  cors(corsOptions);

// =====================================
// ADDITIONAL SECURITY HEADERS
// =====================================

export const additionalSecurityHeaders:
  RequestHandler = (_req, res, next) => {

    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );

    res.removeHeader("X-Powered-By");

    next();
  };

// =====================================
// PREVENT SENSITIVE RESPONSE CACHING
// =====================================

export const preventSensitiveCaching:
  RequestHandler = (_req, res, next) => {

    res.setHeader(
      "Cache-Control",
      "no-store, private"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    res.setHeader(
      "Expires",
      "0"
    );

    next();
  };
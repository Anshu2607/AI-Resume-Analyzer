import express from "express";
import type { ErrorRequestHandler } from "express";

import dotenv from "dotenv";
import multer from "multer";

import {
  DEPLOYMENT_CONFIG,
} from "./config/deployment.config.js";

import {
  SECURITY_CONFIG,
} from "./config/security.config.js";

import {
  securityHeaders,
  securityCors,
  additionalSecurityHeaders,
  preventSensitiveCaching,
  SecurityError,
} from "./middleware/security.middleware.js";

import {
  createDistributedRateLimiter,
} from "./middleware/rateLimit.middleware.js";

import {
  inputSecurity,
} from "./middleware/inputSecurity.middleware.js";

import {
  requestLogger,
  requestCorrelation,
} from "./middleware/requestLogger.middleware.js";

import {
  getRequestId,
  logApplicationError,
  logSecurityEvent,
} from "./utils/logger.utils.js";

// =====================================
// APPLICATION ROUTES
// =====================================

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import vectorSearchRoutes from "./routes/vectorSearch.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import jobMatchingRoutes from "./routes/jobMatching.routes.js";
import roadmapRoutes from "./routes/roadmap.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import interviewRoutes from "./routes/interview.routes.js";
import backgroundJobRoutes from "./routes/backgroundJob.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import aiQuotaRoutes from "./routes/aiQuota.routes.js";

dotenv.config();

const app = express();

// =====================================
// SECURITY AND PROXY CONFIGURATION
// =====================================

app.disable("x-powered-by");

app.set(
  "trust proxy",
  DEPLOYMENT_CONFIG.trustedProxy
);

// =====================================
// REQUEST LOGGING
// =====================================

app.use(requestLogger);

app.use(requestCorrelation);

// =====================================
// SECURITY MIDDLEWARE
// =====================================

app.use(securityHeaders);

app.use(additionalSecurityHeaders);

app.use("/api", preventSensitiveCaching);

app.use(securityCors);

// =====================================
// PUBLIC ROOT ENDPOINT
// =====================================

app.get("/", (_req, res) => {

  res.status(200).json({

    success: true,

    message: "Welcome to CareerLens AI API",

    version: "1.0.0",

  });

});

// =====================================
// INTERNAL READINESS PROTECTION
// =====================================

app.get("/api/v1/ready", (req, res, next) => {

  const remoteAddress =
    req.socket.remoteAddress;

  const isLoopback = [

    "127.0.0.1",

    "::1",

    "::ffff:127.0.0.1",

  ].includes(remoteAddress || "");

  if (!isLoopback) {

    res.status(403).json({

      success: false,

      message: "Readiness endpoint is internal",

    });

    return;

  }

  next();

});

// =====================================
// HEALTH MONITORING
// =====================================

app.use("/api/v1", healthRoutes);

// =====================================
// GLOBAL RATE LIMITER
// =====================================

const globalLimiter =
  createDistributedRateLimiter({

    name: "global-api",

    windowMs:
      SECURITY_CONFIG.rateLimits.global.windowMs,

    max:
      SECURITY_CONFIG.rateLimits.global.max,

    message:
      "Too many requests. Please try again later.",

  });

// =====================================
// LOGIN RATE LIMITER
// =====================================

const authenticationLimiter =
  createDistributedRateLimiter({

    name: "authentication-login",

    windowMs:
      SECURITY_CONFIG.rateLimits.authentication.windowMs,

    max:
      SECURITY_CONFIG.rateLimits.authentication.max,

    message:
      "Too many login attempts. Please try again later.",

  });

// =====================================
// REGISTRATION RATE LIMITER
// =====================================

const registrationLimiter =
  createDistributedRateLimiter({

    name: "authentication-registration",

    windowMs:
      SECURITY_CONFIG.rateLimits.registration.windowMs,

    max:
      SECURITY_CONFIG.rateLimits.registration.max,

    message:
      "Too many registration attempts. Please try again later.",

  });

// =====================================
// APPLY RATE LIMITING
// =====================================

app.use("/api/v1", globalLimiter);

app.post(
  "/api/v1/auth/login",
  authenticationLimiter
);

app.post(
  "/api/v1/auth/register",
  registrationLimiter
);

// =====================================
// REQUEST BODY LIMITS
// =====================================

app.use(
  express.json({

    limit:
      SECURITY_CONFIG.requestLimits.json,

  })
);

app.use(
  express.urlencoded({

    extended: true,

    limit:
      SECURITY_CONFIG.requestLimits.urlencoded,

    parameterLimit:
      SECURITY_CONFIG.requestLimits.parameterLimit,

  })
);

// =====================================
// INPUT SECURITY
// =====================================

app.use("/api/v1", inputSecurity);

// =====================================
// AUTHENTICATION ROUTES
// =====================================

app.use(
  "/api/v1/auth",
  authRoutes
);

// =====================================
// RESUME MANAGEMENT
// =====================================

app.use(
  "/api/v1/resumes",
  resumeRoutes
);

// =====================================
// AI RESUME ANALYSIS
// =====================================

app.use(
  "/api/v1/analyses",
  analysisRoutes
);

// =====================================
// VECTOR SEARCH
// =====================================

app.use(
  "/api/v1/vectors",
  vectorSearchRoutes
);

// =====================================
// RAG CONVERSATIONS
// =====================================

app.use(
  "/api/v1/conversations",
  conversationRoutes
);

// =====================================
// SEMANTIC JOB MATCHING
// =====================================

app.use(
  "/api/v1/job-matches",
  jobMatchingRoutes
);

// =====================================
// AGENTIC AI
// =====================================

app.use(
  "/api/v1/agents",
  agentRoutes
);

// =====================================
// AI INTERVIEW PREPARATION
// =====================================

app.use(
  "/api/v1/interviews",
  interviewRoutes
);

// =====================================
// BACKGROUND JOB PROCESSING
// =====================================

app.use(
  "/api/v1/jobs",
  backgroundJobRoutes
);

// =====================================
// REGULAR USER AI QUOTAS
// =====================================

app.use(
  "/api/v1/ai-quota",
  aiQuotaRoutes
);

// =====================================
// ADMINISTRATOR ROUTES
// =====================================

app.use(
  "/api/v1/admin",
  adminRoutes
);

// =====================================
// SKILL GAP AND CAREER ROADMAP
// =====================================

app.use(
  "/api/v1",
  roadmapRoutes
);

// =====================================
// ROUTE NOT FOUND
// =====================================

app.use((_req, res) => {

  res.status(404).json({

    success: false,

    message:
      "Requested route was not found",

    requestId:
      getRequestId(res),

  });

});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

const errorHandler: ErrorRequestHandler = (

  error,

  _req,

  res,

  next

): void => {

  const requestId =
    getRequestId(res);

  // ===================================
  // RESPONSE ALREADY SENT
  // ===================================

  if (res.headersSent) {

    logApplicationError(
      error,
      "response_already_sent",
      requestId
    );

    next(error);

    return;

  }

  // ===================================
  // SECURITY ERRORS
  // ===================================

  if (error instanceof SecurityError) {

    if (
      error.message === "Origin is not allowed"
    ) {

      logSecurityEvent(
        "CORS_REJECTED",
        requestId
      );

    }

    res.status(error.statusCode).json({

      success: false,

      message: error.message,

      requestId,

    });

    return;

  }

  // ===================================
  // FILE UPLOAD ERRORS
  // ===================================

  if (error instanceof multer.MulterError) {

    logSecurityEvent(
      "INVALID_INPUT",
      requestId
    );

    if (
      error.code === "LIMIT_FILE_SIZE"
    ) {

      res.status(413).json({

        success: false,

        message:
          "File size must not exceed 5 MB",

        requestId,

      });

      return;

    }

    res.status(400).json({

      success: false,

      message:
        "Invalid file upload request",

      requestId,

    });

    return;

  }

  // ===================================
  // REQUEST VALIDATION ERRORS
  // ===================================

  const errorDetails = (

    error && typeof error === "object"

      ? error

      : {}

  ) as {

    type?: string;

    status?: number;

    statusCode?: number;

    message?: string;

  };

  if (

    errorDetails.type === "entity.too.large" ||

    errorDetails.type === "parameters.too.many" ||

    errorDetails.status === 413 ||

    errorDetails.statusCode === 413

  ) {

    logSecurityEvent(
      "INVALID_INPUT",
      requestId
    );

    res.status(413).json({

      success: false,

      message:
        "Request exceeds the allowed size limit",

      requestId,

    });

    return;

  }

  if (
    errorDetails.type === "entity.parse.failed"
  ) {

    logSecurityEvent(
      "INVALID_INPUT",
      requestId
    );

    res.status(400).json({

      success: false,

      message:
        "Invalid request body",

      requestId,

    });

    return;

  }

  // ===================================
  // UNSUPPORTED MEDIA TYPE
  // ===================================

  if (

    errorDetails.status === 415 ||

    errorDetails.statusCode === 415 ||

    (

      error instanceof Error &&

      /only pdf|unsupported file type/i
        .test(error.message)

    )

  ) {

    logSecurityEvent(
      "INVALID_INPUT",
      requestId
    );

    res.status(415).json({

      success: false,

      message:
        "Unsupported request or file type",

      requestId,

    });

    return;

  }

  // ===================================
  // UNEXPECTED APPLICATION ERRORS
  // ===================================

  logApplicationError(

    error,

    "global_error_handler",

    requestId

  );

  res.status(500).json({

    success: false,

    message:
      "An internal server error occurred",

    requestId,

  });

};

app.use(errorHandler);

// =====================================
// EXPORT APPLICATION
// =====================================

export default app;
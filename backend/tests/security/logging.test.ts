import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";
import pino from "pino";

import { Writable } from "node:stream";

// =====================================
// MOCK LOGGER METHODS
// =====================================

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// =====================================
// REAL PINO LOGGER WITH SAFE SPIES
// =====================================

vi.mock(
  "../../src/config/logger.config.js",
  async () => {

    const { default: pino } =
      await import("pino");

    const logger = pino({
      level: "silent",
    });

    const originalChild =
      logger.child.bind(logger);

    logger.child = (bindings, options) => {

      // Preserve the complete Pino logger.

      const child = originalChild(
        bindings,
        options
      );

      child.info = mocks.info;
      child.warn = mocks.warn;
      child.error = mocks.error;

      return child;
    };

    logger.info = mocks.info;
    logger.warn = mocks.warn;
    logger.error = mocks.error;

    return {
      logger,
      default: logger,
    };
  }
);

// =====================================
// IMPORT APPLICATION UTILITIES
// =====================================

import {
  requestLogger,
  requestCorrelation,
} from "../../src/middleware/requestLogger.middleware.js";

import {
  getRequestId,
  logApplicationError,
  logSecurityEvent,
  logPerformance,
} from "../../src/utils/logger.utils.js";

import {
  logAIGenerationStarted,
  logAIGenerationSuccess,
  logAIGenerationFailure,
  logAIProviderFallback,
  logAIPromptSecurity,
  logJobStarted,
  logJobCompleted,
  logJobFailed,
  logWorkerEvent,
} from "../../src/utils/aiLogger.utils.js";

// =====================================
// TEST APPLICATION
// =====================================

const app = express();

app.use(requestLogger);
app.use(requestCorrelation);

app.get("/test", (_req, res) => {

  res.status(200).json({
    success: true,

    requestId: getRequestId(res),
  });

});

app.get("/error", (_req, res) => {

  res.status(500).json({
    success: false,

    requestId: getRequestId(res),
  });

});

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================
// REQUEST CORRELATION TESTS
// =====================================

describe("HTTP Request Correlation", () => {

  it("generates a request ID", async () => {

    const response = await request(app)
      .get("/test");

    expect(response.status).toBe(200);

    expect(
      response.headers["x-request-id"]
    ).toBeDefined();

  });

  it("generates valid UUID request IDs", async () => {

    const response = await request(app)
      .get("/test");

    expect(
      response.headers["x-request-id"]
    ).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

  });

  it("generates different IDs for separate requests", async () => {

    const first = await request(app)
      .get("/test");

    const second = await request(app)
      .get("/test");

    expect(
      first.headers["x-request-id"]
    ).not.toBe(
      second.headers["x-request-id"]
    );

  });

  it("does not trust client-provided request IDs", async () => {

    const response = await request(app)
      .get("/test")
      .set(
        "X-Request-ID",
        "untrusted-client-id"
      );

    expect(
      response.headers["x-request-id"]
    ).not.toBe("untrusted-client-id");

  });

  it("preserves correlation between response header and body", async () => {

    const response = await request(app)
      .get("/test");

    expect(
      response.body.requestId
    ).toBe(
      response.headers["x-request-id"]
    );

  });

  it("includes request IDs in error responses", async () => {

    const response = await request(app)
      .get("/error");

    expect(response.status).toBe(500);

    expect(
      response.body.requestId
    ).toBe(
      response.headers["x-request-id"]
    );

  });

});

// =====================================
// APPLICATION LOGGING TESTS
// =====================================

describe("Application Logging", () => {

  it("logs application errors with correlation IDs", () => {

    logApplicationError(
      new Error("Internal failure"),

      "test_operation",

      "request-123"
    );

    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "test_operation",

        requestId: "request-123",

        errorName: "Error",
      }),

      expect.any(String)
    );

  });

  it("does not expose raw error messages", () => {

    const sensitiveMessage =
      "Private API key: fake-secret-123";

    logApplicationError(
      new Error(sensitiveMessage),

      "test_operation"
    );

    expect(mocks.error).toHaveBeenCalled();

    expect(
      JSON.stringify(mocks.error.mock.calls)
    ).not.toContain(sensitiveMessage);

  });

  it("logs structured security events", () => {

    logSecurityEvent(
      "AUTHENTICATION_FAILED",

      "request-123"
    );

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "security",

        event: "AUTHENTICATION_FAILED",

        requestId: "request-123",
      }),

      expect.any(String)
    );

  });

  it("records operation performance", () => {

    logPerformance(
      "resume_analysis",

      250,

      "request-123"
    );

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "performance",

        operation: "resume_analysis",

        durationMs: 250,
      }),

      expect.any(String)
    );

  });

});

// =====================================
// AI LOGGING TESTS
// =====================================

describe("AI Provider Logging", () => {

  it("logs AI generation attempts", () => {

    logAIGenerationStarted(
      "groq",
      "test-model",
      1
    );

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AI_GENERATION_STARTED",

        provider: "groq",

        model: "test-model",

        attempt: 1,
      }),

      expect.any(String)
    );

  });

  it("records successful generation duration", () => {

    logAIGenerationSuccess(
      "groq",
      "test-model",
      500
    );

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AI_GENERATION_COMPLETED",

        durationMs: 500,
      }),

      expect.any(String)
    );

  });

  it("logs generation failure metadata", () => {

    logAIGenerationFailure(
      "groq",
      429,
      true,
      1
    );

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AI_GENERATION_FAILED",

        statusCode: 429,

        retryable: true,

        attempt: 1,
      }),

      expect.any(String)
    );

  });

  it("logs provider fallback events", () => {

    logAIProviderFallback(
      "groq",
      "gemini"
    );

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AI_PROVIDER_FALLBACK",

        primaryProvider: "groq",

        fallbackProvider: "gemini",
      }),

      expect.any(String)
    );

  });

  it("logs prompt security metadata", () => {

    logAIPromptSecurity(
      "high",

      ["instruction_override"]
    );

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "AI_PROMPT_SECURITY_EVENT",

        riskLevel: "high",

        detectedPatterns: [
          "instruction_override",
        ],
      }),

      expect.any(String)
    );

  });

});

// =====================================
// BACKGROUND WORKER LOGGING TESTS
// =====================================

describe("Background Worker Logging", () => {

  it("logs job execution attempts", () => {

    logJobStarted(
      "job-123",
      "interview-report",
      1
    );

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "BACKGROUND_JOB_STARTED",

        jobId: "job-123",

        jobType: "interview-report",

        attempt: 1,
      }),

      expect.any(String)
    );

  });

  it("logs job completion duration", () => {

    logJobCompleted(
      "job-123",
      "interview-report",
      1500
    );

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "BACKGROUND_JOB_COMPLETED",

        durationMs: 1500,
      }),

      expect.any(String)
    );

  });

  it("logs job failures without private data", () => {

    const privateError =
      "Private resume content: candidate information";

    logJobFailed(
      "job-123",

      "interview-report",

      new Error(privateError),

      2
    );

    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "BACKGROUND_JOB_FAILED",

        attemptsMade: 2,

        errorName: "Error",
      }),

      expect.any(String)
    );

    expect(
      JSON.stringify(mocks.error.mock.calls)
    ).not.toContain(privateError);

  });

  it("logs worker lifecycle events", () => {

    logWorkerEvent("WORKER_STARTED");

    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "WORKER_STARTED",
      }),

      expect.any(String)
    );

  });

  it("uses error logging for worker errors", () => {

    logWorkerEvent("WORKER_ERROR");

    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "WORKER_ERROR",
      }),

      expect.any(String)
    );

  });

});

// =====================================
// SENSITIVE DATA REDACTION
// =====================================

describe("Sensitive Data Redaction", () => {

  const createTestLogger = () => {

    const output: string[] = [];

    const destination = new Writable({

      write(chunk, _encoding, callback) {

        output.push(chunk.toString());

        callback();

      },

    });

    const testLogger = pino(
      {
        level: "info",

        redact: {
          paths: [
            "password",
            "token",
            "apiKey",
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body",
            "*.password",
          ],

          censor: "[REDACTED]",
        },
      },

      destination
    );

    return {
      testLogger,
      output,
    };

  };

  it("redacts passwords", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      password: "private-password",
    });

    expect(output.join(""))
      .not.toContain("private-password");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

  it("redacts authentication tokens", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      token: "private-jwt-token",
    });

    expect(output.join(""))
      .not.toContain("private-jwt-token");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

  it("redacts API keys", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      apiKey: "private-api-key",
    });

    expect(output.join(""))
      .not.toContain("private-api-key");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

  it("redacts authorization headers and cookies", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      req: {
        headers: {
          authorization: "Bearer private-token",

          cookie: "session=private-session",
        },
      },
    });

    expect(output.join(""))
      .not.toContain("private-token");

    expect(output.join(""))
      .not.toContain("private-session");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

  it("redacts sensitive request bodies", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      req: {
        body: {
          resume: "Private candidate resume",
        },
      },
    });

    expect(output.join(""))
      .not.toContain("Private candidate resume");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

  it("redacts nested passwords", () => {

    const { testLogger, output } =
      createTestLogger();

    testLogger.info({
      user: {
        password: "nested-private-password",
      },
    });

    expect(output.join(""))
      .not.toContain("nested-private-password");

    expect(output.join(""))
      .toContain("[REDACTED]");

  });

});
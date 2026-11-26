import {
  describe,
  it,
  expect,
} from "vitest";

import express from "express";
import type { ErrorRequestHandler } from "express";
import request from "supertest";

import {
  securityHeaders,
  securityCors,
  additionalSecurityHeaders,
  preventSensitiveCaching,
  SecurityError,
} from "../../src/middleware/security.middleware.js";

// =====================================
// ISOLATED EXPRESS APPLICATION
// =====================================

const app = express();

app.disable("x-powered-by");

app.use(securityHeaders);
app.use(additionalSecurityHeaders);
app.use(securityCors);
app.use(preventSensitiveCaching);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.get("/test", (_req, res) => {
  res.status(200).json({
    success: true,
  });
});

app.post("/test", (_req, res) => {
  res.status(200).json({
    success: true,
  });
});

// =====================================
// ERROR HANDLER
// =====================================

const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {

  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SecurityError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  if (error.type === "entity.too.large") {
    res.status(413).json({
      success: false,
      message: "Request too large",
    });

    return;
  }

  if (error.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      message: "Invalid request body",
    });

    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

app.use(errorHandler);

// =====================================
// HTTP SECURITY HEADERS
// =====================================

describe("HTTP Security Headers", () => {

  it("includes Content Security Policy", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["content-security-policy"]
    ).toContain("default-src 'none'");
  });

  it("prevents clickjacking", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["x-frame-options"]
    ).toBe("DENY");
  });

  it("prevents MIME-type sniffing", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["x-content-type-options"]
    ).toBe("nosniff");
  });

  it("hides the Express technology header", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["x-powered-by"]
    ).toBeUndefined();
  });

  it("includes a secure referrer policy", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["referrer-policy"]
    ).toBe("no-referrer");
  });

  it("restricts camera and microphone permissions", async () => {
    const response = await request(app)
      .get("/test");

    const policy =
      response.headers["permissions-policy"];

    expect(policy).toContain("camera=()");

    expect(policy).toContain("microphone=()");
  });

  it("does not enable HSTS in the test environment", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["strict-transport-security"]
    ).toBeUndefined();
  });

});

// =====================================
// CORS SECURITY
// =====================================

describe("CORS Security", () => {

  it("allows the configured frontend origin", async () => {
    const response = await request(app)
      .get("/test")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);

    expect(
      response.headers["access-control-allow-origin"]
    ).toBe("http://localhost:5173");
  });

  it("rejects unauthorized origins", async () => {
    const response = await request(app)
      .get("/test")
      .set("Origin", "https://unauthorized.example.com");

    expect(response.status).toBe(403);

    expect(
      response.headers["access-control-allow-origin"]
    ).toBeUndefined();
  });

  it("rejects origins attempting domain impersonation", async () => {
    const response = await request(app)
      .get("/test")
      .set(
        "Origin",
        "http://localhost.attacker.example.com:5173"
      );

    expect(response.status).toBe(403);
  });

  it("rejects null origins", async () => {
    const response = await request(app)
      .get("/test")
      .set("Origin", "null");

    expect(response.status).toBe(403);
  });

  it("allows server-to-server requests without Origin", async () => {
    const response = await request(app)
      .get("/test");

    expect(response.status).toBe(200);
  });

  it("handles valid CORS preflight requests", async () => {
    const response = await request(app)
      .options("/test")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "authorization,content-type,idempotency-key"
      );

    expect(response.status).toBe(204);

    expect(
      response.headers["access-control-allow-methods"]
    ).toContain("POST");

    expect(
      response.headers["access-control-allow-headers"]
        .toLowerCase()
    ).toContain("authorization");

    expect(
      response.headers["access-control-allow-headers"]
        .toLowerCase()
    ).toContain("idempotency-key");
  });

  it("rejects unauthorized preflight requests", async () => {
    const response = await request(app)
      .options("/test")
      .set("Origin", "https://unauthorized.example.com")
      .set("Access-Control-Request-Method", "POST");

    expect(response.status).toBe(403);
  });

});

// =====================================
// SENSITIVE RESPONSE CACHING
// =====================================

describe("Sensitive Response Protection", () => {

  it("prevents sensitive responses from being cached", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["cache-control"]
    ).toContain("no-store");

    expect(
      response.headers["cache-control"]
    ).toContain("private");
  });

  it("includes legacy cache prevention headers", async () => {
    const response = await request(app)
      .get("/test");

    expect(
      response.headers["pragma"]
    ).toBe("no-cache");

    expect(
      response.headers["expires"]
    ).toBe("0");
  });

});

// =====================================
// REQUEST BODY PROTECTION
// =====================================

describe("Request Body Protection", () => {

  it("accepts valid JSON requests", async () => {
    const response = await request(app)
      .post("/test")
      .send({
        name: "CareerLens AI",
      });

    expect(response.status).toBe(200);
  });

  it("rejects oversized JSON requests", async () => {
    const response = await request(app)
      .post("/test")
      .send({
        content: "A".repeat(2 * 1024 * 1024),
      });

    expect(response.status).toBe(413);
  });

  it("rejects malformed JSON requests", async () => {
    const response = await request(app)
      .post("/test")
      .set("Content-Type", "application/json")
      .send('{"name":');

    expect(response.status).toBe(400);
  });

});
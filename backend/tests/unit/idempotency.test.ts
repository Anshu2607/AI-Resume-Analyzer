import {
  describe,
  it,
  expect,
  vi,
} from "vitest";

// Prevent real Redis connections.

vi.mock("../../src/config/redis.config.js", () => ({
  default: {
    status: "ready",
  },
}));

import {
  validateIdempotencyKey,
  createRequestFingerprint,
  IdempotencyError,
} from "../../src/services/idempotency.service.js";

// =====================================
// IDEMPOTENCY KEY VALIDATION
// =====================================

describe("Idempotency Key Validation", () => {

  it("accepts a valid idempotency key", () => {
    expect(() =>
      validateIdempotencyKey(
        "careerlens-request-001"
      )
    ).not.toThrow();
  });

  it("accepts a UUID idempotency key", () => {
    expect(() =>
      validateIdempotencyKey(
        "550e8400-e29b-41d4-a716-446655440000"
      )
    ).not.toThrow();
  });

  it("rejects an empty key", () => {
    expect(() =>
      validateIdempotencyKey("")
    ).toThrow(IdempotencyError);
  });

  it("rejects a key shorter than eight characters", () => {
    expect(() =>
      validateIdempotencyKey("abc123")
    ).toThrow(IdempotencyError);
  });

  it("rejects a key exceeding 128 characters", () => {
    expect(() =>
      validateIdempotencyKey("A".repeat(129))
    ).toThrow(IdempotencyError);
  });

  it("rejects keys containing spaces", () => {
    expect(() =>
      validateIdempotencyKey("invalid request key")
    ).toThrow(IdempotencyError);
  });

  it("rejects unsupported special characters", () => {
    expect(() =>
      validateIdempotencyKey("request@#$123")
    ).toThrow(IdempotencyError);
  });

});

// =====================================
// REQUEST FINGERPRINT TESTS
// =====================================

describe("Request Fingerprinting", () => {

  it("generates a valid SHA-256 fingerprint", () => {
    const fingerprint =
      createRequestFingerprint(
        "POST",
        "/api/v1/interviews",
        { role: "Developer" }
      );

    expect(fingerprint).toMatch(
      /^[a-f0-9]{64}$/
    );
  });

  it("generates identical fingerprints for identical requests", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews",
      { role: "Developer" }
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews",
      { role: "Developer" }
    );

    expect(first).toBe(second);
  });

  it("ignores JSON object property ordering", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews",
      {
        role: "Developer",
        count: 5,
      }
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews",
      {
        count: 5,
        role: "Developer",
      }
    );

    expect(first).toBe(second);
  });

  it("generates different fingerprints for different bodies", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews",
      { count: 5 }
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews",
      { count: 10 }
    );

    expect(first).not.toBe(second);
  });

  it("generates different fingerprints for different paths", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews/session-one",
      {}
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews/session-two",
      {}
    );

    expect(first).not.toBe(second);
  });

  it("generates different fingerprints for different HTTP methods", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews",
      {}
    );

    const second = createRequestFingerprint(
      "GET",
      "/interviews",
      {}
    );

    expect(first).not.toBe(second);
  });

  it("normalizes HTTP method capitalization", () => {
    const first = createRequestFingerprint(
      "post",
      "/interviews",
      {}
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews",
      {}
    );

    expect(first).toBe(second);
  });

  it("supports requests without a body", () => {
    const fingerprint =
      createRequestFingerprint(
        "POST",
        "/jobs/interview-report/session-one",
        undefined
      );

    expect(fingerprint).toMatch(
      /^[a-f0-9]{64}$/
    );
  });

  it("preserves array element ordering", () => {
    const first = createRequestFingerprint(
      "POST",
      "/interviews",
      { topics: ["Java", "SQL"] }
    );

    const second = createRequestFingerprint(
      "POST",
      "/interviews",
      { topics: ["SQL", "Java"] }
    );

    expect(first).not.toBe(second);
  });

});
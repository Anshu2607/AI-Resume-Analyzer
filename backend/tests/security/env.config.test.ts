import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

import {
  validateEnvironment,
} from "../../src/config/env.config.js";

// =====================================
// TEST ENVIRONMENT
// =====================================

beforeEach(() => {

  vi.stubEnv("NODE_ENV", "test");

  vi.stubEnv("PORT", "5001");

  vi.stubEnv(
    "MONGODB_URI",
    "mongodb://127.0.0.1:27018/careerlens_test"
  );

  vi.stubEnv("MONGO_URI", "");

  vi.stubEnv(
    "JWT_SECRET",
    "careerlens-test-secret-for-automated-tests-only"
  );

  vi.stubEnv(
    "CLIENT_URL",
    "http://localhost:5173"
  );

  vi.stubEnv("LLM_PROVIDER", "groq");

  vi.stubEnv(
    "LLM_FALLBACK_PROVIDER",
    "gemini"
  );

  vi.stubEnv(
    "LLM_FALLBACK_ENABLED",
    "true"
  );

  vi.stubEnv(
    "GROQ_API_KEY",
    "test-groq-key"
  );

  vi.stubEnv(
    "GEMINI_API_KEY",
    "test-gemini-key"
  );

  vi.stubEnv("REDIS_HOST", "127.0.0.1");

  vi.stubEnv("REDIS_PORT", "6380");

  vi.stubEnv("REDIS_PASSWORD", "");

  vi.stubEnv("REDIS_DB", "0");

  vi.stubEnv(
    "QUEUE_WORKER_CONCURRENCY",
    "2"
  );

  vi.spyOn(console, "error")
    .mockImplementation(() => {});

  vi.spyOn(console, "log")
    .mockImplementation(() => {});

});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// =====================================
// VALID CONFIGURATION TESTS
// =====================================

describe("Environment Configuration Validation", () => {

  it("accepts a valid test environment", () => {
    expect(() =>
      validateEnvironment()
    ).not.toThrow();
  });

  it("rejects invalid server ports", () => {
    vi.stubEnv("PORT", "70000");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects short JWT secrets", () => {
    vi.stubEnv("JWT_SECRET", "weak");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects missing MongoDB configuration", () => {
    vi.stubEnv("MONGODB_URI", "");

    vi.stubEnv("MONGO_URI", "");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects unsupported MongoDB URI schemes", () => {
    vi.stubEnv(
      "MONGODB_URI",
      "https://invalid-database.example.com"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects unsupported AI providers", () => {
    vi.stubEnv(
      "LLM_PROVIDER",
      "invalid-provider"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects missing primary provider credentials", () => {
    vi.stubEnv("GROQ_API_KEY", "");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects missing fallback provider credentials", () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects identical primary and fallback providers", () => {
    vi.stubEnv(
      "LLM_FALLBACK_PROVIDER",
      "groq"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("allows missing fallback credentials when fallback is disabled", () => {
    vi.stubEnv(
      "LLM_FALLBACK_ENABLED",
      "false"
    );

    vi.stubEnv("GEMINI_API_KEY", "");

    expect(() =>
      validateEnvironment()
    ).not.toThrow();
  });

  it("rejects invalid Redis ports", () => {
    vi.stubEnv("REDIS_PORT", "-1");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects invalid worker concurrency", () => {
    vi.stubEnv(
      "QUEUE_WORKER_CONCURRENCY",
      "0"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

});

// =====================================
// PRODUCTION CONFIGURATION HELPER
// =====================================

const configureProduction = (): void => {

  vi.stubEnv("NODE_ENV", "production");

  vi.stubEnv(
    "JWT_SECRET",
    "a1B2c3D4".repeat(8)
  );

  vi.stubEnv(
    "CLIENT_URL",
    "https://careerlens.example.com"
  );

  vi.stubEnv(
    "REDIS_PASSWORD",
    "fake-production-password"
  );

};

// =====================================
// PRODUCTION SECURITY TESTS
// =====================================

describe("Production Environment Security", () => {

  it("accepts configuration matching production validation rules", () => {
    configureProduction();

    expect(() =>
      validateEnvironment()
    ).not.toThrow();
  });

  it("rejects HTTP frontend origins in production", () => {
    configureProduction();

    vi.stubEnv(
      "CLIENT_URL",
      "http://careerlens.example.com"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects localhost origins in production", () => {
    configureProduction();

    vi.stubEnv(
      "CLIENT_URL",
      "https://localhost:5173"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects missing production frontend origins", () => {
    configureProduction();

    vi.stubEnv("CLIENT_URL", "");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects production Redis without authentication", () => {
    configureProduction();

    vi.stubEnv("REDIS_PASSWORD", "");

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects JWT secrets shorter than the production minimum", () => {
    configureProduction();

    vi.stubEnv(
      "JWT_SECRET",
      "A".repeat(40)
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("rejects placeholder JWT secrets in production", () => {
    configureProduction();

    vi.stubEnv(
      "JWT_SECRET",
      "change-me".repeat(10)
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();
  });

  it("does not expose secret values in validation logs", () => {
    configureProduction();

    const secret = "placeholder-secret".repeat(5);

    vi.stubEnv("JWT_SECRET", secret);

    expect(() =>
      validateEnvironment()
    ).toThrow();

    const logs = JSON.stringify(
      vi.mocked(console.error).mock.calls
    );

    expect(logs).not.toContain(secret);
  });

});
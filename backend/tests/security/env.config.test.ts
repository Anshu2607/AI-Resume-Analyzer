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
// ISOLATED TEST ENVIRONMENT
// =====================================

beforeEach(() => {

  vi.stubEnv("NODE_ENV", "test");

  vi.stubEnv("DEPLOYMENT_MODE", "standard");

  vi.stubEnv("TRUSTED_PROXY", "");

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

  vi.stubEnv("JWT_EXPIRES_IN", "1d");

  vi.stubEnv(
    "CLIENT_URL",
    "http://localhost:5173"
  );

  // ===================================
  // AI PROVIDER CONFIGURATION
  // ===================================

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

  // ===================================
  // REDIS CONFIGURATION
  // ===================================

  vi.stubEnv("REDIS_HOST", "127.0.0.1");

  vi.stubEnv("REDIS_PORT", "6380");

  vi.stubEnv("REDIS_PASSWORD", "");

  vi.stubEnv("REDIS_DB", "0");

  vi.stubEnv(
    "QUEUE_WORKER_CONCURRENCY",
    "2"
  );

  // ===================================
  // ADMINISTRATOR SECURITY
  // ===================================

  // Deterministic dummy key for tests only.
  // Never use this key in production.

  vi.stubEnv(
    "ADMIN_MFA_ENCRYPTION_KEY",
    "0123456789abcdef".repeat(4)
  );

  vi.stubEnv(
    "ADMIN_MFA_ENROLLMENT_ENABLED",
    "false"
  );

  // ===================================
  // AI SECURITY AND ANALYTICS
  // ===================================

  vi.stubEnv(
    "AI_QUOTA_ENABLED",
    "true"
  );

  vi.stubEnv(
    "AI_USAGE_TRACKING_ENABLED",
    "true"
  );

  vi.stubEnv(
    "ACTIVITY_TRACKING_ENABLED",
    "true"
  );

  vi.stubEnv(
    "AI_MODEL_PRICING_JSON",
    "{}"
  );

  // Suppress test validation logs.

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
// ENVIRONMENT CONFIGURATION TESTS
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

  // ===================================
  // NEW SECURITY VALIDATION TESTS
  // ===================================

  it("rejects a missing MFA encryption key", () => {

    vi.stubEnv(
      "ADMIN_MFA_ENCRYPTION_KEY",
      undefined
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects an incorrectly sized MFA encryption key", () => {

    vi.stubEnv(
      "ADMIN_MFA_ENCRYPTION_KEY",
      "a".repeat(32)
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects a non-hexadecimal MFA encryption key", () => {

    vi.stubEnv(
      "ADMIN_MFA_ENCRYPTION_KEY",
      "z".repeat(64)
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid MFA enrollment configuration", () => {

    vi.stubEnv(
      "ADMIN_MFA_ENROLLMENT_ENABLED",
      "invalid"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid JWT expiration formats", () => {

    vi.stubEnv(
      "JWT_EXPIRES_IN",
      "invalid-duration"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid trusted proxy addresses", () => {

    vi.stubEnv(
      "TRUSTED_PROXY",
      "invalid-proxy"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid AI quota configuration", () => {

    vi.stubEnv(
      "AI_QUOTA_ENABLED",
      "invalid"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid AI usage tracking configuration", () => {

    vi.stubEnv(
      "AI_USAGE_TRACKING_ENABLED",
      "invalid"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects invalid model pricing JSON", () => {

    vi.stubEnv(
      "AI_MODEL_PRICING_JSON",
      "invalid-json"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects negative AI pricing rates", () => {

    vi.stubEnv(
      "AI_MODEL_PRICING_JSON",
      JSON.stringify({
        "groq:test-model": {
          inputPerMillion: -1,
          outputPerMillion: 1,
        },
      })
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

  vi.stubEnv("DEPLOYMENT_MODE", "standard");

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

  vi.stubEnv(
    "ADMIN_MFA_ENCRYPTION_KEY",
    "0123456789abcdef".repeat(4)
  );

  vi.stubEnv(
    "ADMIN_MFA_ENROLLMENT_ENABLED",
    "false"
  );

  vi.stubEnv(
    "AI_QUOTA_ENABLED",
    "true"
  );

  vi.stubEnv(
    "AI_USAGE_TRACKING_ENABLED",
    "true"
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

    const secret =
      "placeholder-secret".repeat(5);

    vi.stubEnv("JWT_SECRET", secret);

    expect(() =>
      validateEnvironment()
    ).toThrow();

    const logs = JSON.stringify(
      vi.mocked(console.error).mock.calls
    );

    expect(logs).not.toContain(secret);

  });

  // ===================================
  // ADDITIONAL PRODUCTION SECURITY
  // ===================================

  it("rejects enabled administrator MFA enrollment in production", () => {

    configureProduction();

    vi.stubEnv(
      "ADMIN_MFA_ENROLLMENT_ENABLED",
      "true"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects disabled AI quotas in production", () => {

    configureProduction();

    vi.stubEnv(
      "AI_QUOTA_ENABLED",
      "false"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("rejects disabled AI usage tracking in production", () => {

    configureProduction();

    vi.stubEnv(
      "AI_USAGE_TRACKING_ENABLED",
      "false"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("accepts valid local Docker production configuration", () => {

    configureProduction();

    vi.stubEnv(
      "DEPLOYMENT_MODE",
      "local-docker"
    );

    vi.stubEnv(
      "TRUSTED_PROXY",
      "172.30.50.10"
    );

    vi.stubEnv(
      "CLIENT_URL",
      "http://localhost:3000"
    );

    expect(() =>
      validateEnvironment()
    ).not.toThrow();

  });

  it("rejects local Docker configuration without a trusted proxy", () => {

    configureProduction();

    vi.stubEnv(
      "DEPLOYMENT_MODE",
      "local-docker"
    );

    vi.stubEnv(
      "TRUSTED_PROXY",
      ""
    );

    vi.stubEnv(
      "CLIENT_URL",
      "http://localhost:3000"
    );

    expect(() =>
      validateEnvironment()
    ).toThrow();

  });

  it("accepts valid cloud deployment configuration", () => {

    configureProduction();

    vi.stubEnv(
      "DEPLOYMENT_MODE",
      "cloud"
    );

    expect(() =>
      validateEnvironment()
    ).not.toThrow();

  });

});
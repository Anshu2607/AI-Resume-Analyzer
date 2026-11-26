import { beforeEach, afterEach, vi } from "vitest";

// =====================================
// ISOLATED TEST ENVIRONMENT
// =====================================

process.env.NODE_ENV = "test";

process.env.PORT = "5001";

process.env.CLIENT_URL = "http://localhost:5173";

// Prevent accidental connection to
// the actual MongoDB Atlas database.

process.env.MONGODB_URI =
  "mongodb://127.0.0.1:27018/careerlens_test";

process.env.MONGO_URI =
  "mongodb://127.0.0.1:27018/careerlens_test";

// Dedicated testing JWT secret.

process.env.JWT_SECRET =
  "careerlens-testing-secret-not-for-production-2026";

// Prevent use of actual AI credentials.

process.env.GROQ_API_KEY =
  "test-groq-api-key";

process.env.GEMINI_API_KEY =
  "test-gemini-api-key";

process.env.GOOGLE_API_KEY =
  "test-google-api-key";

// Dedicated test Redis configuration.
// Integration tests will configure their
// own isolated Redis instance.

process.env.REDIS_HOST = "127.0.0.1";

process.env.REDIS_PORT = "6380";

process.env.REDIS_PASSWORD = "";

process.env.REDIS_DB = "0";

process.env.QUEUE_PREFIX = "careerlens-test";

// =====================================
// BEFORE EACH TEST
// =====================================

beforeEach(() => {
  vi.clearAllMocks();
});

// =====================================
// AFTER EACH TEST
// =====================================

afterEach(() => {
  vi.restoreAllMocks();

  vi.useRealTimers();
});
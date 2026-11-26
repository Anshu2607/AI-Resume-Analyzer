import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

// =====================================
// ISOLATED DATABASE AND REDIS MOCKS
// =====================================

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  isSessionRevoked: vi.fn(),
}));

vi.mock("../../src/models/user.model.js", () => ({
  default: {
    findById: mocks.findById,
  },
}));

vi.mock(
  "../../src/config/redis.config.js",
  () => ({
    default: {
      status: "wait",
    },
  })
);

vi.mock(
  "../../src/services/sessionRevocation.service.js",
  () => ({
    isSessionRevoked: mocks.isSessionRevoked,
  })
);

import {
  authenticate,
  authorize,
} from "../../src/middleware/auth.middleware.js";

import type {
  AuthenticatedRequest,
} from "../../src/middleware/auth.middleware.js";

import {
  generateToken,
  generateAdminToken,
  verifyToken,
} from "../../src/utils/jwt.utils.js";

// =====================================
// TEST CONFIGURATION
// =====================================

const JWT_SECRET = process.env.JWT_SECRET!;

const TEST_USER_ID =
  "507f1f77bcf86cd799439011";

const SECOND_USER_ID =
  "507f1f77bcf86cd799439012";

const ADMIN_ID =
  "507f1f77bcf86cd799439013";

interface TestAccount {
  _id: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  sessionVersion: number;
}

const accounts = new Map<
  string,
  TestAccount
>();

// =====================================
// RESET TEST FIXTURES
// =====================================

beforeEach(() => {

  vi.resetAllMocks();

  accounts.clear();

  accounts.set(TEST_USER_ID, {
    _id: TEST_USER_ID,
    role: "user",
    status: "active",
    sessionVersion: 0,
  });

  accounts.set(SECOND_USER_ID, {
    _id: SECOND_USER_ID,
    role: "user",
    status: "active",
    sessionVersion: 0,
  });

  accounts.set(ADMIN_ID, {
    _id: ADMIN_ID,
    role: "admin",
    status: "active",
    sessionVersion: 0,
  });

  mocks.findById.mockImplementation(
    (userId: string) => ({

      select: vi.fn().mockReturnThis(),

      maxTimeMS: vi.fn().mockReturnThis(),

      lean: vi.fn().mockResolvedValue(
        accounts.get(userId) ?? null
      ),

    })
  );

  mocks.isSessionRevoked
    .mockResolvedValue(false);

});

// =====================================
// ISOLATED EXPRESS APPLICATION
// =====================================

const app = express();

app.use(express.json());

app.get(
  "/protected",

  authenticate,

  (req: AuthenticatedRequest, res) => {

    res.status(200).json({
      success: true,
      userId: req.user?.userId,
      role: req.user?.role,
    });

  }
);

app.get(
  "/admin",

  authenticate,

  authorize("admin"),

  (req: AuthenticatedRequest, res) => {

    res.status(200).json({
      success: true,
      userId: req.user?.userId,
      role: req.user?.role,
    });

  }
);

app.get(
  "/dashboard",

  authenticate,

  authorize("user", "admin"),

  (req: AuthenticatedRequest, res) => {

    res.status(200).json({
      success: true,
      role: req.user?.role,
    });

  }
);

// =====================================
// TOKEN HELPERS
// =====================================

const generateTestToken = (
  userId: string = TEST_USER_ID,
  sessionVersion = 0
): string => {

  return generateToken({
    userId,
    role: "user",
    sessionVersion,
  });

};

const generateTestAdminToken = (
  sessionVersion = 0
): string => {

  return generateAdminToken(
    ADMIN_ID,
    sessionVersion
  );

};

const modifyTokenPayload = (
  token: string,
  changes: Record<string, unknown>
): string => {

  const [header, payload, signature] =
    token.split(".");

  const decodedPayload = JSON.parse(
    Buffer.from(
      payload!,
      "base64url"
    ).toString()
  );

  const modifiedPayload = Buffer.from(

    JSON.stringify({
      ...decodedPayload,
      ...changes,
    })

  ).toString("base64url");

  return `${header}.${modifiedPayload}.${signature}`;

};

// =====================================
// JWT AUTHENTICATION SECURITY
// =====================================

describe("JWT Authentication Security", () => {

  it("rejects requests without an authorization header", async () => {

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(401);

  });

  it("allows access with a valid JWT token", async () => {

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(200);

    expect(response.body.userId)
      .toBe(TEST_USER_ID);

    expect(response.body.role)
      .toBe("user");

  });

  it("rejects malformed JWT tokens", async () => {

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        "Bearer invalid-token"
      );

    expect(response.status).toBe(401);

  });

  it("rejects tokens without the Bearer prefix", async () => {

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        generateTestToken()
      );

    expect(response.status).toBe(401);

  });

  it("rejects expired JWT tokens", async () => {

    const expiredToken = jwt.sign(

      {
        userId: TEST_USER_ID,
        role: "user",
        sessionType: "user",
        mfaVerified: false,
        sessionVersion: 0,
        iat: Math.floor(Date.now() / 1000) - 120,
      },

      JWT_SECRET,

      {
        algorithm: "HS256",
        issuer: "careerlens-ai",
        audience: "careerlens-users",
        jwtid: randomUUID(),
        expiresIn: 60,
      }

    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${expiredToken}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects tokens signed with another secret", async () => {

    const invalidToken = jwt.sign(

      {
        userId: TEST_USER_ID,
        role: "user",
        sessionType: "user",
        mfaVerified: false,
        sessionVersion: 0,
      },

      "incorrect-test-secret",

      {
        algorithm: "HS256",
        issuer: "careerlens-ai",
        audience: "careerlens-users",
        jwtid: randomUUID(),
        expiresIn: "1h",
      }

    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${invalidToken}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects modified JWT payloads", async () => {

    const tamperedToken = modifyTokenPayload(

      generateTestToken(),

      {
        userId: SECOND_USER_ID,
      }

    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${tamperedToken}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects Basic authentication", async () => {

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        "Basic dGVzdDp0ZXN0"
      );

    expect(response.status).toBe(401);

  });

  it("rejects an empty Bearer token", async () => {

    const response = await request(app)

      .get("/protected")

      .set("Authorization", "Bearer");

    expect(response.status).toBe(401);

  });

  it("preserves the identity of different authenticated users", async () => {

    const firstResponse = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken(TEST_USER_ID)}`
      );

    const secondResponse = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken(SECOND_USER_ID)}`
      );

    expect(firstResponse.status).toBe(200);

    expect(secondResponse.status).toBe(200);

    expect(firstResponse.body.userId)
      .toBe(TEST_USER_ID);

    expect(secondResponse.body.userId)
      .toBe(SECOND_USER_ID);

  });

});

// =====================================
// ROLE-BASED ACCESS CONTROL
// =====================================

describe("Role-Based Access Control", () => {

  it("allows an administrator to access admin routes", async () => {

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${generateTestAdminToken()}`
      );

    expect(response.status).toBe(200);

    expect(response.body.role)
      .toBe("admin");

  });

  it("prevents regular users from accessing admin routes", async () => {

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(403);

    expect(response.body.success)
      .toBe(false);

  });

  it("rejects unauthenticated access to admin routes", async () => {

    const response = await request(app)
      .get("/admin");

    expect(response.status).toBe(401);

  });

  it("allows regular users to access shared routes", async () => {

    const response = await request(app)

      .get("/dashboard")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(200);

  });

  it("allows administrators to access shared routes", async () => {

    const response = await request(app)

      .get("/dashboard")

      .set(
        "Authorization",
        `Bearer ${generateTestAdminToken()}`
      );

    expect(response.status).toBe(200);

  });

  it("prevents privilege escalation through JWT modification", async () => {

    const tamperedToken = modifyTokenPayload(

      generateTestToken(),

      {
        role: "admin",
      }

    );

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${tamperedToken}`
      );

    expect(response.status).toBe(401);

  });

});

// =====================================
// NEW SESSION SECURITY TESTS
// =====================================

describe("Session Versioning and Revocation", () => {

  it("rejects legacy JWTs without a session version", async () => {

    const token = jwt.sign(

      {
        userId: TEST_USER_ID,
        role: "user",
        sessionType: "user",
        mfaVerified: false,
      },

      JWT_SECRET,

      {
        algorithm: "HS256",
        issuer: "careerlens-ai",
        audience: "careerlens-users",
        jwtid: randomUUID(),
        expiresIn: "1h",
      }

    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects JWTs without a unique session identifier", async () => {

    const token = jwt.sign(

      {
        userId: TEST_USER_ID,
        role: "user",
        sessionType: "user",
        mfaVerified: false,
        sessionVersion: 0,
      },

      JWT_SECRET,

      {
        algorithm: "HS256",
        issuer: "careerlens-ai",
        audience: "careerlens-users",
        expiresIn: "1h",
      }

    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(401);

  });

  it("generates unique identifiers for different JWTs", () => {

    const first = verifyToken(
      generateTestToken()
    );

    const second = verifyToken(
      generateTestToken()
    );

    expect(first.jti).toBeDefined();

    expect(second.jti).toBeDefined();

    expect(first.jti).not.toBe(second.jti);

  });

  it("rejects tokens belonging to deleted accounts", async () => {

    accounts.delete(TEST_USER_ID);

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects suspended user accounts", async () => {

    accounts.set(TEST_USER_ID, {
      _id: TEST_USER_ID,
      role: "user",
      status: "suspended",
      sessionVersion: 1,
    });

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(403);

  });

  it("rejects an old token after account reactivation", async () => {

    const oldToken = generateTestToken(
      TEST_USER_ID,
      0
    );

    accounts.set(TEST_USER_ID, {
      _id: TEST_USER_ID,
      role: "user",
      status: "active",
      sessionVersion: 2,
    });

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${oldToken}`
      );

    expect(response.status).toBe(401);

  });

  it("accepts a fresh token with the updated session version", async () => {

    accounts.set(TEST_USER_ID, {
      _id: TEST_USER_ID,
      role: "user",
      status: "active",
      sessionVersion: 2,
    });

    const freshToken = generateTestToken(
      TEST_USER_ID,
      2
    );

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${freshToken}`
      );

    expect(response.status).toBe(200);

  });

  it("rejects JWTs when database permissions have changed", async () => {

    const token = generateTestToken();

    accounts.set(TEST_USER_ID, {
      _id: TEST_USER_ID,
      role: "admin",
      status: "active",
      sessionVersion: 0,
    });

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(401);

  });

  it("rejects revoked administrator sessions", async () => {

    mocks.isSessionRevoked
      .mockResolvedValue(true);

    const token = generateTestAdminToken();

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(401);

    expect(mocks.isSessionRevoked)
      .toHaveBeenCalledWith(
        verifyToken(token).jti
      );

  });

  it("rejects administrator JWTs without MFA verification", async () => {

    const token = jwt.sign(

      {
        userId: ADMIN_ID,
        role: "admin",
        sessionType: "admin",
        mfaVerified: false,
        sessionVersion: 0,
      },

      JWT_SECRET,

      {
        algorithm: "HS256",
        issuer: "careerlens-ai",
        audience: "careerlens-admins",
        jwtid: randomUUID(),
        expiresIn: "30m",
      }

    );

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(401);

  });

  it("prevents generating administrator JWTs through regular authentication", () => {

    expect(() =>

      generateToken({
        userId: ADMIN_ID,
        role: "admin",
        sessionVersion: 0,
      })

    ).toThrow();

  });

  it("fails securely when session verification is unavailable", async () => {

    mocks.isSessionRevoked
      .mockRejectedValue(
        new Error("Redis unavailable")
      );

    const response = await request(app)

      .get("/admin")

      .set(
        "Authorization",
        `Bearer ${generateTestAdminToken()}`
      );

    expect(response.status).toBe(503);

  });

  it("fails securely when the account database is unavailable", async () => {

    mocks.findById.mockImplementation(() => ({

      select: vi.fn().mockReturnThis(),

      maxTimeMS: vi.fn().mockReturnThis(),

      lean: vi.fn().mockRejectedValue(
        new Error("Database unavailable")
      ),

    }));

    const response = await request(app)

      .get("/protected")

      .set(
        "Authorization",
        `Bearer ${generateTestToken()}`
      );

    expect(response.status).toBe(503);

  });

});
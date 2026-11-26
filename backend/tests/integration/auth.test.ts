import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";

import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../helpers/testDatabase.js";

import authRoutes from "../../src/routes/auth.routes.js";

// =====================================
// ISOLATED EXPRESS APPLICATION
// =====================================

const app = express();

app.use(express.json());

app.use(
  "/api/v1/auth",
  authRoutes
);

// =====================================
// TEST USER
// =====================================

const testUser = {
  name: "CareerLens Test User",

  email: "careerlens-test@example.com",

  password: "TestPassword@123",
};

// =====================================
// AUTHENTICATION INTEGRATION TESTS
// =====================================

describe("Authentication API Integration", () => {

  beforeAll(async () => {
    await connectTestDatabase();
  }, 180000);

  afterEach(async () => {
    await clearTestDatabase();

    vi.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  // ===================================
  // TEST 1: REGISTER USER
  // ===================================

  it("registers a new user successfully", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

  });

  // ===================================
  // TEST 2: DUPLICATE REGISTRATION
  // ===================================

  it("rejects duplicate email registration", async () => {

    const firstResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(firstResponse.status).toBe(201);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect([400, 409]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 3: INVALID EMAIL
  // ===================================

  it("rejects an invalid email address", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...testUser,

        email: "invalid-email",
      });

    expect([400, 422]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 4: MISSING PASSWORD
  // ===================================

  it("rejects registration without a password", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: testUser.name,

        email: testUser.email,
      });

    expect([400, 422]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 5: WEAK PASSWORD
  // ===================================

  it("rejects an excessively short password", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...testUser,

        password: "123",
      });

    expect([400, 422]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 6: SUCCESSFUL LOGIN
  // ===================================

  it("logs in a registered user successfully", async () => {

    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(registration.status).toBe(201);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,

        password: testUser.password,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

  });

  // ===================================
  // TEST 7: INCORRECT PASSWORD
  // ===================================

  it("rejects login with an incorrect password", async () => {

    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(registration.status).toBe(201);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,

        password: "IncorrectPassword@123",
      });

    expect([400, 401]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 8: NONEXISTENT USER
  // ===================================

  it("rejects login for an unregistered user", async () => {

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "unknown@example.com",

        password: testUser.password,
      });

    expect([400, 401, 404]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 9: MISSING LOGIN CREDENTIALS
  // ===================================

  it("rejects login without credentials", async () => {

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect([400, 422]).toContain(
      response.status
    );

    expect(response.body.success).toBe(false);

  });

  // ===================================
  // TEST 10: PASSWORD EXPOSURE
  // ===================================

  it("does not expose the password in the registration response", async () => {

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(response.status).toBe(201);

    expect(
      JSON.stringify(response.body)
    ).not.toContain(testUser.password);

    expect(
      JSON.stringify(response.body)
    ).not.toMatch(/"password(Hash)?":/i);

  });

});
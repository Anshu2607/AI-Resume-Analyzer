import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";

import mongoose from "mongoose";

import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../helpers/testDatabase.js";

// =====================================
// TEST MODEL
// =====================================

const testUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },
});

const TestUser = mongoose.model(
  "IntegrationTestUser",
  testUserSchema
);

// =====================================
// DATABASE INTEGRATION TESTS
// =====================================

describe("MongoDB Integration", () => {

  beforeAll(async () => {

    await connectTestDatabase();

    await TestUser.init();

  }, 180000);

  afterEach(async () => {

    await clearTestDatabase();

  });

  afterAll(async () => {

    await disconnectTestDatabase();

  });

  // ===================================
  // TEST 1: DATABASE CONNECTION
  // ===================================

  it("connects to the isolated test database", () => {

    expect(
      mongoose.connection.readyState
    ).toBe(1);

    expect(
      mongoose.connection.name
    ).toBe("careerlens_test");

  });

  // ===================================
  // TEST 2: CREATE DOCUMENT
  // ===================================

  it("creates a document successfully", async () => {

    const user = await TestUser.create({
      name: "Test User",

      email: "test@example.com",
    });

    expect(user._id).toBeDefined();

    expect(user.name).toBe("Test User");

    expect(user.email).toBe(
      "test@example.com"
    );

  });

  // ===================================
  // TEST 3: READ DOCUMENT
  // ===================================

  it("retrieves a saved document", async () => {

    await TestUser.create({
      name: "Java Developer",

      email: "java@example.com",
    });

    const user = await TestUser.findOne({
      email: "java@example.com",
    });

    expect(user).not.toBeNull();

    expect(user?.name).toBe(
      "Java Developer"
    );

  });

  // ===================================
  // TEST 4: UPDATE DOCUMENT
  // ===================================

  it("updates an existing document", async () => {

    const user = await TestUser.create({
      name: "Developer",

      email: "developer@example.com",
    });

    await TestUser.findByIdAndUpdate(
      user._id,

      {
        name: "Backend Developer",
      }
    );

    const updatedUser =
      await TestUser.findById(user._id);

    expect(updatedUser?.name).toBe(
      "Backend Developer"
    );

  });

  // ===================================
  // TEST 5: DELETE DOCUMENT
  // ===================================

  it("deletes an existing document", async () => {

    const user = await TestUser.create({
      name: "Delete User",

      email: "delete@example.com",
    });

    await TestUser.findByIdAndDelete(
      user._id
    );

    const deletedUser =
      await TestUser.findById(user._id);

    expect(deletedUser).toBeNull();

  });

  // ===================================
  // TEST 6: UNIQUE CONSTRAINT
  // ===================================

  it("rejects duplicate email addresses", async () => {

    await TestUser.create({
      name: "First User",

      email: "duplicate@example.com",
    });

    await expect(
      TestUser.create({
        name: "Second User",

        email: "duplicate@example.com",
      })
    ).rejects.toMatchObject({
      code: 11000,
    });

  });

  // ===================================
  // TEST 7: REQUIRED FIELD
  // ===================================

  it("rejects documents with missing required fields", async () => {

    await expect(
      TestUser.create({
        name: "Incomplete User",
      })
    ).rejects.toThrow();

  });

  // ===================================
  // TEST 8: TEST DATA ISOLATION
  // ===================================

  it("starts each test with an empty collection", async () => {

    const count =
      await TestUser.countDocuments();

    expect(count).toBe(0);

  });

});
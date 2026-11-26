import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

import express from "express";
import request from "supertest";
import mongoose from "mongoose";

// =====================================
// PREVENT REAL REDIS CONNECTIONS
// =====================================

vi.mock("../../src/config/redis.config.js", () => ({

  default: {
    status: "wait",
  },

}));

import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../helpers/testDatabase.js";

import {
  authenticate,
} from "../../src/middleware/auth.middleware.js";

import {
  generateToken,
} from "../../src/utils/jwt.utils.js";

import User from "../../src/models/user.model.js";

import InterviewSession from "../../src/models/interviewSession.model.js";

import {
  getInterviewByIdController,
  getInterviewsController,
  deleteInterviewController,
} from "../../src/controllers/interview.controller.js";

// =====================================
// TEST USER IDENTITIES
// =====================================

const OWNER_ID =
  "507f1f77bcf86cd799439011";

const OTHER_USER_ID =
  "507f1f77bcf86cd799439012";

// =====================================
// GENERATE VERSIONED TEST TOKENS
// =====================================

const ownerToken = generateToken({

  userId: OWNER_ID,

  role: "user",

  sessionVersion: 0,

});

const otherUserToken = generateToken({

  userId: OTHER_USER_ID,

  role: "user",

  sessionVersion: 0,

});

// =====================================
// ISOLATED EXPRESS APPLICATION
// =====================================

const app = express();

app.use(express.json());

app.get(
  "/interviews",

  authenticate,

  getInterviewsController
);

app.get(
  "/interviews/:sessionId",

  authenticate,

  getInterviewByIdController
);

app.delete(
  "/interviews/:sessionId",

  authenticate,

  deleteInterviewController
);

// =====================================
// TEST RESOURCE STATE
// =====================================

let ownerSessionId: string;

let otherSessionId: string;

// =====================================
// CREATE TEST USER ACCOUNTS
// =====================================

const createTestUsers = async (): Promise<void> => {

  const now = new Date();

  await User.collection.insertMany([

    {

      _id: new mongoose.Types.ObjectId(
        OWNER_ID
      ),

      name: "Interview Owner",

      email: "owner@example.test",

      password: "unused-test-password",

      role: "user",

      status: "active",

      sessionVersion: 0,

      lastLoginAt: null,

      lastActiveAt: now,

      loginCount: 0,

      suspendedAt: null,

      createdAt: now,

      updatedAt: now,

      __v: 0,

    },

    {

      _id: new mongoose.Types.ObjectId(
        OTHER_USER_ID
      ),

      name: "Other Interview User",

      email: "other@example.test",

      password: "unused-test-password",

      role: "user",

      status: "active",

      sessionVersion: 0,

      lastLoginAt: null,

      lastActiveAt: now,

      loginCount: 0,

      suspendedAt: null,

      createdAt: now,

      updatedAt: now,

      __v: 0,

    },

  ]);

};

// =====================================
// CREATE TEST INTERVIEW SESSION
// =====================================

const createTestSession = async (
  userId: string
): Promise<string> => {

  const sessionId =
    new mongoose.Types.ObjectId();

  const now = new Date();

  // Insert a controlled fixture without
  // invoking external AI generation.

  await InterviewSession.collection.insertOne({

    _id: sessionId,

    userId:
      new mongoose.Types.ObjectId(userId),

    resumeId: null,

    jobMatchId: null,

    interviewType: "technical",

    targetRole: "Java Backend Developer",

    companyName: "",

    initialDifficulty: "intermediate",

    currentDifficulty: "intermediate",

    questionCount: 3,

    topics: ["Java", "SQL"],

    adaptiveDifficulty: true,

    enableFollowUps: true,

    consent: true,

    status: "completed",

    context: {},

    questions: [],

    answers: [],

    currentQuestionIndex: 0,

    answeredQuestions: 0,

    skippedQuestions: 0,

    followUpCount: 0,

    progressPercentage: 100,

    averageScore: null,

    report: null,

    provider: "groq",

    modelUsed: "test-model",

    interviewVersion: "1.0.0",

    isLocked: false,

    lockToken: null,

    lockedAt: null,

    startedAt: now,

    completedAt: now,

    createdAt: now,

    updatedAt: now,

    __v: 0,

  });

  return sessionId.toString();

};

// =====================================
// RESOURCE AUTHORIZATION TESTS
// =====================================

describe("Interview Resource Authorization", () => {

  beforeAll(async () => {

    await connectTestDatabase();

  }, 180000);

  beforeEach(async () => {

    await clearTestDatabase();

    // Authentication now verifies that
    // the corresponding account exists.

    await createTestUsers();

    ownerSessionId =
      await createTestSession(OWNER_ID);

    otherSessionId =
      await createTestSession(OTHER_USER_ID);

  });

  afterAll(async () => {

    await disconnectTestDatabase();

  });

  // ===================================
  // TEST 1: OWNER ACCESS
  // ===================================

  it("allows users to access their own interview", async () => {

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(response.body.data._id)
      .toBe(ownerSessionId);

  });

  // ===================================
  // TEST 2: CROSS-USER ACCESS
  // ===================================

  it("prevents users from accessing another user's interview", async () => {

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${otherUserToken}`
      );

    expect([403, 404])
      .toContain(response.status);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.data)
      .toBeUndefined();

  });

  // ===================================
  // TEST 3: UNAUTHENTICATED ACCESS
  // ===================================

  it("prevents unauthenticated interview access", async () => {

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`);

    expect(response.status).toBe(401);

  });

  // ===================================
  // TEST 4: INVALID RESOURCE ID
  // ===================================

  it("rejects malformed interview session IDs", async () => {

    const response = await request(app)

      .get("/interviews/invalid-session-id")

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(400);

  });

  // ===================================
  // TEST 5: NONEXISTENT RESOURCE
  // ===================================

  it("rejects access to nonexistent interviews", async () => {

    const nonexistentId =
      new mongoose.Types.ObjectId().toString();

    const response = await request(app)

      .get(`/interviews/${nonexistentId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(404);

  });

  // ===================================
  // TEST 6: INTERVIEW HISTORY ISOLATION
  // ===================================

  it("returns only interviews belonging to the authenticated user", async () => {

    const response = await request(app)

      .get("/interviews")

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(200);

    const sessions =
      response.body.data.sessions;

    expect(sessions).toHaveLength(1);

    expect(sessions[0]._id)
      .toBe(ownerSessionId);

    expect(

      sessions.some(
        (session: { _id: string }) =>
          session._id === otherSessionId
      )

    ).toBe(false);

  });

  // ===================================
  // TEST 7: CROSS-USER DELETION
  // ===================================

  it("prevents users from deleting another user's interview", async () => {

    const response = await request(app)

      .delete(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${otherUserToken}`
      );

    expect([403, 404])
      .toContain(response.status);

    const existingSession =
      await InterviewSession.findById(
        ownerSessionId
      );

    expect(existingSession)
      .not.toBeNull();

  });

  // ===================================
  // TEST 8: OWNER DELETION
  // ===================================

  it("allows users to delete their own interview", async () => {

    const response = await request(app)

      .delete(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(200);

    expect(response.body.success)
      .toBe(true);

    const deletedSession =
      await InterviewSession.findById(
        ownerSessionId
      );

    expect(deletedSession)
      .toBeNull();

    const unrelatedSession =
      await InterviewSession.findById(
        otherSessionId
      );

    expect(unrelatedSession)
      .not.toBeNull();

  });

  // ===================================
  // TEST 9: UNAUTHENTICATED DELETION
  // ===================================

  it("prevents unauthenticated interview deletion", async () => {

    const response = await request(app)

      .delete(`/interviews/${ownerSessionId}`);

    expect(response.status).toBe(401);

    const existingSession =
      await InterviewSession.findById(
        ownerSessionId
      );

    expect(existingSession)
      .not.toBeNull();

  });

  // ===================================
  // TEST 10: SUSPENDED ACCOUNT
  // ===================================

  it("prevents suspended users from accessing their own interviews", async () => {

    await User.updateOne(

      {
        _id: OWNER_ID,
      },

      {
        $set: {
          status: "suspended",
          suspendedAt: new Date(),
        },

        $inc: {
          sessionVersion: 1,
        },
      }

    );

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(403);

  });

  // ===================================
  // TEST 11: REACTIVATED ACCOUNT
  // ===================================

  it("rejects old tokens after account reactivation", async () => {

    await User.updateOne(

      {
        _id: OWNER_ID,
      },

      {
        $set: {
          status: "suspended",
          suspendedAt: new Date(),
        },

        $inc: {
          sessionVersion: 1,
        },
      }

    );

    await User.updateOne(

      {
        _id: OWNER_ID,
      },

      {
        $set: {
          status: "active",
          suspendedAt: null,
        },

        $inc: {
          sessionVersion: 1,
        },
      }

    );

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(401);

  });

  // ===================================
  // TEST 12: FRESH VERSIONED TOKEN
  // ===================================

  it("allows access using a fresh token after reactivation", async () => {

    await User.updateOne(

      {
        _id: OWNER_ID,
      },

      {
        $set: {
          status: "active",
          sessionVersion: 2,
        },
      }

    );

    const freshToken = generateToken({

      userId: OWNER_ID,

      role: "user",

      sessionVersion: 2,

    });

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${freshToken}`
      );

    expect(response.status).toBe(200);

    expect(response.body.data._id)
      .toBe(ownerSessionId);

  });

  // ===================================
  // TEST 13: DELETED USER ACCOUNT
  // ===================================

  it("prevents deleted accounts from accessing existing interview resources", async () => {

    await User.deleteOne({

      _id: OWNER_ID,

    });

    const response = await request(app)

      .get(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(401);

  });

  // ===================================
  // TEST 14: REVOKED TOKEN DELETION
  // ===================================

  it("prevents revoked tokens from deleting interview resources", async () => {

    await User.updateOne(

      {
        _id: OWNER_ID,
      },

      {
        $inc: {
          sessionVersion: 1,
        },
      }

    );

    const response = await request(app)

      .delete(`/interviews/${ownerSessionId}`)

      .set(
        "Authorization",
        `Bearer ${ownerToken}`
      );

    expect(response.status).toBe(401);

    const existingSession =
      await InterviewSession.findById(
        ownerSessionId
      );

    expect(existingSession)
      .not.toBeNull();

  });

});
import {
  describe,
  it,
  expect,
} from "vitest";

import {
  createInterviewSchema,
  submitInterviewAnswerSchema,
  skipInterviewQuestionSchema,
} from "../../src/validators/interview.validator.js";

// =====================================
// VALID TEST DATA
// =====================================

const validRequest = {
  interviewType: "technical",

  targetRole: "Java Backend Developer",

  difficulty: "intermediate",

  questionCount: 5,

  topics: ["Java", "Spring Boot", "SQL"],

  adaptiveDifficulty: true,

  enableFollowUps: true,

  consent: true,
};

const validQuestionId =
  "550e8400-e29b-41d4-a716-446655440000";

// =====================================
// INTERVIEW CREATION TESTS
// =====================================

describe("Interview Creation Validation", () => {

  it("accepts a valid interview request", () => {
    const result =
      createInterviewSchema.safeParse(validRequest);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid interview type", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        interviewType: "invalid",
      });

    expect(result.success).toBe(false);
  });

  it("rejects an empty target role", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        targetRole: "",
      });

    expect(result.success).toBe(false);
  });

  it("rejects fewer than three questions", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        questionCount: 2,
      });

    expect(result.success).toBe(false);
  });

  it("rejects more than fifteen questions", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        questionCount: 16,
      });

    expect(result.success).toBe(false);
  });

  it("rejects decimal question counts", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        questionCount: 5.5,
      });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty level", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        difficulty: "expert",
      });

    expect(result.success).toBe(false);
  });

  it("rejects requests without AI processing consent", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        consent: false,
      });

    expect(result.success).toBe(false);
  });

  it("rejects more than ten topics", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,

        topics: Array.from(
          { length: 11 },
          (_, index) => `Topic ${index}`
        ),
      });

    expect(result.success).toBe(false);
  });

  it("rejects topics exceeding the maximum length", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        topics: ["A".repeat(101)],
      });

    expect(result.success).toBe(false);
  });

  it("requires a resume ID for resume-based interviews", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        interviewType: "resume_based",
      });

    expect(result.success).toBe(false);
  });

  it("accepts a valid resume-based interview", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,

        interviewType: "resume_based",

        resumeId: "507f1f77bcf86cd799439011",
      });

    expect(result.success).toBe(true);
  });

  it("requires a job match ID for job-specific interviews", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        interviewType: "job_specific",
      });

    expect(result.success).toBe(false);
  });

  it("accepts a valid job-specific interview", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,

        interviewType: "job_specific",

        jobMatchId: "507f1f77bcf86cd799439012",
      });

    expect(result.success).toBe(true);
  });

  it("rejects invalid MongoDB resource IDs", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        resumeId: "invalid-id",
      });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected request fields", () => {
    const result =
      createInterviewSchema.safeParse({
        ...validRequest,
        isAdmin: true,
      });

    expect(result.success).toBe(false);
  });

});

// =====================================
// ANSWER SUBMISSION TESTS
// =====================================

describe("Interview Answer Validation", () => {

  it("accepts a valid interview answer", () => {
    const result =
      submitInterviewAnswerSchema.safeParse({
        questionId: validQuestionId,
        answer: "HashMap stores key-value pairs.",
      });

    expect(result.success).toBe(true);
  });

  it("rejects an empty answer", () => {
    const result =
      submitInterviewAnswerSchema.safeParse({
        questionId: validQuestionId,
        answer: "",
      });

    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only answers", () => {
    const result =
      submitInterviewAnswerSchema.safeParse({
        questionId: validQuestionId,
        answer: "     ",
      });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid question ID", () => {
    const result =
      submitInterviewAnswerSchema.safeParse({
        questionId: "invalid-question",
        answer: "Sample answer",
      });

    expect(result.success).toBe(false);
  });

  it("rejects answers exceeding 10000 characters", () => {
    const result =
      submitInterviewAnswerSchema.safeParse({
        questionId: validQuestionId,
        answer: "A".repeat(10001),
      });

    expect(result.success).toBe(false);
  });

});

// =====================================
// SKIP QUESTION TESTS
// =====================================

describe("Skip Interview Question Validation", () => {

  it("accepts a valid question ID", () => {
    const result =
      skipInterviewQuestionSchema.safeParse({
        questionId: validQuestionId,
      });

    expect(result.success).toBe(true);
  });

  it("rejects a missing question ID", () => {
    const result =
      skipInterviewQuestionSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects an invalid question ID", () => {
    const result =
      skipInterviewQuestionSchema.safeParse({
        questionId: "invalid",
      });

    expect(result.success).toBe(false);
  });

});
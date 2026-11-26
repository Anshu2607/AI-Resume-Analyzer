import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";

// =====================================
// MOCK LLM SERVICE
// =====================================

vi.mock(
  "../../src/services/llm.service.js",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("../../src/services/llm.service.js")
    >();

    return {
      ...actual,
      generateLLMResponse: vi.fn(),
    };
  }
);

import {
  generateLLMResponse,
  LLMError,
} from "../../src/services/llm.service.js";

import {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  getPublicInterviewQuestion,
  InterviewAIError,
} from "../../src/services/interviewAI.service.js";

import type {
  QuestionGenerationInput,
} from "../../src/prompts/interviewQuestion.prompt.js";

import type {
  AnswerEvaluationInput,
} from "../../src/prompts/interviewEvaluation.prompt.js";

import type {
  GeneratedQuestion,
  GeneratedEvaluation,
  InterviewQuestion,
  InterviewAnswer,
} from "../../src/validators/interview.validator.js";

import {
  INTERVIEW_CONFIG,
  calculateInterviewScore,
} from "../../src/config/interview.config.js";

// =====================================
// MOCK LLM FUNCTION
// =====================================

const mockLLM = vi.mocked(generateLLMResponse);

// =====================================
// QUESTION INPUT FIXTURE
// =====================================

const validQuestionInput: QuestionGenerationInput = {
  interviewType: "technical",
  targetRole: "Java Backend Developer",
  companyName: null,
  difficulty: "intermediate",
  questionNumber: 1,
  totalQuestions: 5,
  topics: ["Java", "SQL"],
  resumeContext: null,
  jobContext: null,

  // Required field missing in previous tests.
  identifiedSkillGaps: [],

  previousQuestions: [],
  previousAnswers: [],
  isFollowUp: false,
  parentQuestionId: null,
  followUpFocus: null,
};

// =====================================
// VALID AI-GENERATED QUESTION
// =====================================

const validGeneratedQuestion: GeneratedQuestion = {
  question:
    "What is the difference between HashMap and ConcurrentHashMap?",

  category: "technical",

  topic: "Java Collections",

  expectedAnswer:
    "HashMap is not thread-safe, whereas ConcurrentHashMap supports concurrent access and updates.",

  keyPoints: [
    "HashMap is not thread-safe",
    "ConcurrentHashMap supports concurrent operations",
    "Differences in synchronization",
  ],
};

// =====================================
// PERSISTED QUESTION FIXTURE
// =====================================

const validInterviewQuestion: InterviewQuestion = {
  ...validGeneratedQuestion,

  questionId:
    "550e8400-e29b-41d4-a716-446655440000",

  questionNumber: 1,
  difficulty: "intermediate",
  isFollowUp: false,
  parentQuestionId: null,
  generatedAt: new Date().toISOString(),
};

// =====================================
// VALID AI EVALUATION FIXTURE
// =====================================

const validGeneratedEvaluation: GeneratedEvaluation = {
  scores: {
    accuracy: 80,
    relevance: 90,
    completeness: 60,
    clarity: 70,
  },

  feedback:
    "The answer demonstrates a good understanding but lacks implementation details.",

  strengths: [
    "Correct identification of thread safety",
  ],

  weaknesses: [
    "Insufficient explanation of concurrent operations",
  ],

  missingKeyPoints: [
    "Atomic operations",
  ],

  improvementSuggestions: [
    "Explain concurrent updates using practical examples",
  ],

  modelAnswer:
    "ConcurrentHashMap provides thread-safe concurrent operations, unlike HashMap.",

  recommendFollowUp: false,

  followUpFocus: null,
};

// =====================================
// ANSWER EVALUATION INPUT
// =====================================

const validEvaluationInput: AnswerEvaluationInput = {
  interviewType: "technical",

  targetRole: "Java Backend Developer",

  question: validInterviewQuestion,

  candidateAnswer:
    "HashMap is not thread-safe, but ConcurrentHashMap supports multiple threads.",

  enableFollowUps: true,

  resumeContext: null,

  jobContext: null,
};

// =====================================
// MOCK RESPONSE HELPERS
// =====================================

const mockResponse = (content: string) => ({
  content,
  provider: "groq" as const,
  model: "test-groq-model",
});

const mockJSONResponse = (data: unknown) =>
  mockResponse(JSON.stringify(data));

beforeEach(() => {
  mockLLM.mockReset();
});

// =====================================
// 1. QUESTION INPUT VALIDATION
// =====================================

describe("Interview Question Input Validation", () => {

  it("rejects fewer than the minimum questions", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        totalQuestions:
          INTERVIEW_CONFIG.minQuestions - 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("rejects more than the maximum questions", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        totalQuestions:
          INTERVIEW_CONFIG.maxQuestions + 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects decimal question limits", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        totalQuestions: 5.5,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects question number zero", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        questionNumber: 0,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects question numbers exceeding the total", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        questionNumber: 6,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an invalid question sequence", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        questionNumber: 2,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("requires resume context for resume-based interviews", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        interviewType: "resume_based",
        resumeContext: null,
      })
    ).rejects.toMatchObject({
      statusCode: 422,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("requires job context for job-specific interviews", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        interviewType: "job_specific",
        jobContext: null,
      })
    ).rejects.toMatchObject({
      statusCode: 422,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("rejects follow-up questions without a parent question", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        isFollowUp: true,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects independent questions containing follow-up metadata", async () => {
    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,
        parentQuestionId:
          validInterviewQuestion.questionId,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

});

// =====================================
// 2. QUESTION GENERATION FAILURES
// =====================================

describe("Interview Question Generation Failures", () => {

  it("handles AI provider unavailability", async () => {
    mockLLM.mockRejectedValue(
      new LLMError(
        "Provider unavailable",
        503,
        true
      )
    );

    await expect(
      generateInterviewQuestion(validQuestionInput)
    ).rejects.toMatchObject({
      name: "InterviewAIError",
      statusCode: 503,
      message:
        "AI question generation is currently unavailable",
    });

    expect(mockLLM).toHaveBeenCalledTimes(1);
  });

  it("handles AI provider rate limiting", async () => {
    mockLLM.mockRejectedValue(
      new LLMError(
        "Rate limit reached",
        429,
        true
      )
    );

    await expect(
      generateInterviewQuestion(validQuestionInput)
    ).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it("retries when AI returns invalid JSON", async () => {
    mockLLM.mockResolvedValue(
      mockResponse("Invalid JSON response")
    );

    await expect(
      generateInterviewQuestion(validQuestionInput)
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxGenerationAttempts
    );
  });

  it("rejects incomplete AI question objects", async () => {
    mockLLM.mockResolvedValue(
      mockResponse("{}")
    );

    await expect(
      generateInterviewQuestion(validQuestionInput)
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxGenerationAttempts
    );
  });

  it("includes correction instructions in the retry prompt", async () => {
    mockLLM.mockResolvedValue(
      mockResponse("Invalid JSON")
    );

    await expect(
      generateInterviewQuestion(validQuestionInput)
    ).rejects.toBeInstanceOf(
      InterviewAIError
    );

    expect(mockLLM).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userPrompt: expect.stringContaining(
          "CORRECTION REQUIRED"
        ),
      })
    );
  });

});

// =====================================
// 3. ANSWER INPUT VALIDATION
// =====================================

describe("Interview Answer Input Validation", () => {

  it("rejects an empty candidate answer", async () => {
    await expect(
      evaluateInterviewAnswer({
        ...validEvaluationInput,
        candidateAnswer: "",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only candidate answers", async () => {
    await expect(
      evaluateInterviewAnswer({
        ...validEvaluationInput,
        candidateAnswer: "     ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

  it("rejects answers exceeding the character limit", async () => {
    await expect(
      evaluateInterviewAnswer({
        ...validEvaluationInput,
        candidateAnswer: "A".repeat(
          INTERVIEW_CONFIG.maxAnswerCharacters + 1
        ),
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockLLM).not.toHaveBeenCalled();
  });

});

// =====================================
// 4. WEIGHTED SCORE CALCULATION
// =====================================

describe("Interview Weighted Score Calculation", () => {

  it("returns 100 when every dimension is 100", () => {
    expect(
      calculateInterviewScore({
        accuracy: 100,
        relevance: 100,
        completeness: 100,
        clarity: 100,
      })
    ).toBe(100);
  });

  it("returns zero when every dimension is zero", () => {
    expect(
      calculateInterviewScore({
        accuracy: 0,
        relevance: 0,
        completeness: 0,
        clarity: 0,
      })
    ).toBe(0);
  });

  it("assigns 35 percent weight to accuracy", () => {
    expect(
      calculateInterviewScore({
        accuracy: 100,
        relevance: 0,
        completeness: 0,
        clarity: 0,
      })
    ).toBe(35);
  });

  it("assigns 25 percent weight to relevance", () => {
    expect(
      calculateInterviewScore({
        accuracy: 0,
        relevance: 100,
        completeness: 0,
        clarity: 0,
      })
    ).toBe(25);
  });

  it("assigns 25 percent weight to completeness", () => {
    expect(
      calculateInterviewScore({
        accuracy: 0,
        relevance: 0,
        completeness: 100,
        clarity: 0,
      })
    ).toBe(25);
  });

  it("assigns 15 percent weight to clarity", () => {
    expect(
      calculateInterviewScore({
        accuracy: 0,
        relevance: 0,
        completeness: 0,
        clarity: 100,
      })
    ).toBe(15);
  });

  it("calculates the combined weighted score correctly", () => {
    expect(
      calculateInterviewScore({
        accuracy: 80,
        relevance: 90,
        completeness: 60,
        clarity: 70,
      })
    ).toBe(76);
  });

});

// =====================================
// 5. SUCCESSFUL QUESTION GENERATION
// =====================================

describe("Successful Interview Question Generation", () => {

  it("generates a valid interview question", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse(validGeneratedQuestion)
    );

    const result =
      await generateInterviewQuestion(
        validQuestionInput
      );

    expect(result.question.question).toBe(
      validGeneratedQuestion.question
    );

    expect(result.question.questionId)
      .toBeDefined();

    expect(result.question.questionNumber)
      .toBe(1);

    expect(result.question.difficulty)
      .toBe("intermediate");

    expect(result.provider).toBe("groq");

    expect(result.modelUsed)
      .toBe("test-groq-model");

    expect(mockLLM).toHaveBeenCalledTimes(1);
  });

  it("successfully generates a question after correcting invalid JSON", async () => {
    mockLLM
      .mockResolvedValueOnce(
        mockResponse("Invalid JSON")
      )
      .mockResolvedValueOnce(
        mockJSONResponse(validGeneratedQuestion)
      );

    const result =
      await generateInterviewQuestion(
        validQuestionInput
      );

    expect(result.question.question).toBe(
      validGeneratedQuestion.question
    );

    expect(mockLLM).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate interview questions", async () => {
    const previousAnswer: InterviewAnswer = {
      questionId:
        validInterviewQuestion.questionId,

      answer: "",

      status: "skipped",

      evaluation: null,

      submittedAt: new Date().toISOString(),
    };

    mockLLM.mockResolvedValue(
      mockJSONResponse(validGeneratedQuestion)
    );

    await expect(
      generateInterviewQuestion({
        ...validQuestionInput,

        questionNumber: 2,

        previousQuestions: [
          validInterviewQuestion,
        ],

        previousAnswers: [
          previousAnswer,
        ],
      })
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxGenerationAttempts
    );
  });

  it("rejects inappropriate interview question categories", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedQuestion,

        category: "hr",
      })
    );

    await expect(
      generateInterviewQuestion(
        validQuestionInput
      )
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxGenerationAttempts
    );
  });

  it("does not expose expected answers or evaluation key points", () => {
    const publicQuestion =
      getPublicInterviewQuestion(
        validInterviewQuestion
      );

    expect(publicQuestion.question).toBe(
      validInterviewQuestion.question
    );

    expect(publicQuestion)
      .not.toHaveProperty("expectedAnswer");

    expect(publicQuestion)
      .not.toHaveProperty("keyPoints");

    expect(publicQuestion.questionId).toBe(
      validInterviewQuestion.questionId
    );
  });

});

// =====================================
// 6. COMPLETE ANSWER EVALUATION
// =====================================

describe("Interview Answer Evaluation", () => {

  it("successfully evaluates a candidate answer", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse(validGeneratedEvaluation)
    );

    const result =
      await evaluateInterviewAnswer(
        validEvaluationInput
      );

    expect(result.scores).toEqual(
      validGeneratedEvaluation.scores
    );

    expect(result.overallScore).toBe(76);

    expect(result.feedback).toBe(
      validGeneratedEvaluation.feedback
    );

    expect(result.provider).toBe("groq");

    expect(result.modelUsed)
      .toBe("test-groq-model");

    expect(mockLLM).toHaveBeenCalledTimes(1);
  });

  it("rejects evaluation scores greater than 100", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedEvaluation,

        scores: {
          ...validGeneratedEvaluation.scores,
          accuracy: 101,
        },
      })
    );

    await expect(
      evaluateInterviewAnswer(
        validEvaluationInput
      )
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxEvaluationAttempts
    );
  });

  it("rejects AI-generated overall scores", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedEvaluation,

        overallScore: 100,
      })
    );

    await expect(
      evaluateInterviewAnswer(
        validEvaluationInput
      )
    ).rejects.toMatchObject({
      statusCode: 502,
    });

    expect(mockLLM).toHaveBeenCalledTimes(
      INTERVIEW_CONFIG.maxEvaluationAttempts
    );
  });

  it("prevents follow-ups when they are disabled", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedEvaluation,

        recommendFollowUp: true,

        followUpFocus:
          "Explain atomic update operations",
      })
    );

    const result =
      await evaluateInterviewAnswer({
        ...validEvaluationInput,

        enableFollowUps: false,
      });

    expect(result.recommendFollowUp)
      .toBe(false);

    expect(result.followUpFocus)
      .toBeNull();
  });

  it("allows follow-ups for eligible evaluation scores", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedEvaluation,

        scores: {
          accuracy: 65,
          relevance: 65,
          completeness: 65,
          clarity: 65,
        },

        recommendFollowUp: true,

        followUpFocus:
          "Explain ConcurrentHashMap operations",
      })
    );

    const result =
      await evaluateInterviewAnswer(
        validEvaluationInput
      );

    expect(result.overallScore).toBe(65);

    expect(result.recommendFollowUp)
      .toBe(true);

    expect(result.followUpFocus).toBe(
      "Explain ConcurrentHashMap operations"
    );
  });

  it("prevents follow-ups for scores above the configured threshold", async () => {
    mockLLM.mockResolvedValue(
      mockJSONResponse({
        ...validGeneratedEvaluation,

        scores: {
          accuracy: 100,
          relevance: 100,
          completeness: 100,
          clarity: 100,
        },

        recommendFollowUp: true,

        followUpFocus:
          "Explain concurrent collections",
      })
    );

    const result =
      await evaluateInterviewAnswer(
        validEvaluationInput
      );

    expect(result.overallScore).toBe(100);

    expect(result.recommendFollowUp)
      .toBe(false);

    expect(result.followUpFocus)
      .toBeNull();
  });

  it("handles AI provider failure during evaluation", async () => {
    mockLLM.mockRejectedValue(
      new LLMError(
        "Provider unavailable",
        503,
        true
      )
    );

    await expect(
      evaluateInterviewAnswer(
        validEvaluationInput
      )
    ).rejects.toMatchObject({
      name: "InterviewAIError",

      statusCode: 503,

      message:
        "AI answer evaluation is currently unavailable",
    });

    expect(mockLLM).toHaveBeenCalledTimes(1);
  });

});
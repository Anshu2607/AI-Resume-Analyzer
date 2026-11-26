import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

// =====================================
// PROVIDER SDK MOCKS
// =====================================

const {
  mockGroqCreate,
  mockGeminiGenerate,
} = vi.hoisted(() => ({
  mockGroqCreate: vi.fn(),
  mockGeminiGenerate: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: mockGroqCreate,
      },
    };
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGeminiGenerate,
    };
  },
}));

import {
  generateLLMResponse,
  getActiveProvider,
} from "../../src/services/llm.service.js";

// =====================================
// TEST DATA
// =====================================

const validRequest = {
  systemPrompt:
    "Return a valid JSON object.",

  userPrompt:
    "Explain Java.",
};

const validContent = {
  explanation:
    "Java is an object-oriented programming language.",
};

// =====================================
// RESPONSE HELPERS
// =====================================

const groqResponse = (
  content: string = JSON.stringify(validContent),

  finishReason: string = "stop"
) => ({
  choices: [
    {
      finish_reason: finishReason,

      message: {
        content,
      },
    },
  ],
});

const geminiResponse = (
  content: string = JSON.stringify(validContent),

  finishReason: string = "STOP"
) => ({
  text: content,

  candidates: [
    {
      finishReason,
    },
  ],
});

// =====================================
// TEST ENVIRONMENT
// =====================================

beforeEach(() => {

  mockGroqCreate.mockReset();

  mockGeminiGenerate.mockReset();

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
    "test-groq-api-key"
  );

  vi.stubEnv(
    "GEMINI_API_KEY",
    "test-gemini-api-key"
  );

  vi.stubEnv(
    "GROQ_MODEL",
    "mock-groq-model"
  );

  vi.stubEnv(
    "GEMINI_MODEL",
    "mock-gemini-model"
  );

});

afterEach(() => {

  vi.unstubAllEnvs();

});

// =====================================
// PROVIDER CONFIGURATION TESTS
// =====================================

describe("LLM Provider Configuration", () => {

  it("selects Groq as the primary provider", () => {

    expect(getActiveProvider()).toBe("groq");

  });

  it("supports Gemini as the primary provider", () => {

    vi.stubEnv("LLM_PROVIDER", "gemini");

    expect(getActiveProvider()).toBe("gemini");

  });

  it("rejects an unsupported primary provider", () => {

    vi.stubEnv(
      "LLM_PROVIDER",
      "invalid-provider"
    );

    expect(() => getActiveProvider())
      .toThrow("Invalid primary LLM provider");

  });

});

// =====================================
// SUCCESSFUL GENERATION TESTS
// =====================================

describe("LLM Successful Generation", () => {

  it("generates a valid Groq response", async () => {

    mockGroqCreate.mockResolvedValue(
      groqResponse()
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("groq");

    expect(result.model).toBe(
      "mock-groq-model"
    );

    expect(JSON.parse(result.content))
      .toEqual(validContent);

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(1);

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

  it("generates a valid Gemini response", async () => {

    vi.stubEnv("LLM_PROVIDER", "gemini");

    mockGeminiGenerate.mockResolvedValue(
      geminiResponse()
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("gemini");

    expect(result.model).toBe(
      "mock-gemini-model"
    );

    expect(JSON.parse(result.content))
      .toEqual(validContent);

    expect(mockGroqCreate)
      .not.toHaveBeenCalled();

  });

  it("removes Markdown JSON code fences", async () => {

    const content =
      "```json\n" +
      JSON.stringify(validContent) +
      "\n```";

    mockGroqCreate.mockResolvedValue(
      groqResponse(content)
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(JSON.parse(result.content))
      .toEqual(validContent);

    expect(result.content)
      .not.toContain("```");

  });

  it("requests structured JSON from Groq", async () => {

    mockGroqCreate.mockResolvedValue(
      groqResponse()
    );

    await generateLLMResponse(validRequest);

    expect(mockGroqCreate)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: {
            type: "json_object",
          },

          stream: false,

          max_completion_tokens: 8192,
        })
      );

  });

});

// =====================================
// INPUT VALIDATION TESTS
// =====================================

describe("LLM Input Validation", () => {

  it("rejects an empty system prompt", async () => {

    await expect(
      generateLLMResponse({
        ...validRequest,

        systemPrompt: "",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockGroqCreate)
      .not.toHaveBeenCalled();

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

  it("rejects a whitespace-only user prompt", async () => {

    await expect(
      generateLLMResponse({
        ...validRequest,

        userPrompt: "   ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(mockGroqCreate)
      .not.toHaveBeenCalled();

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

});

// =====================================
// RETRY AND FALLBACK TESTS
// =====================================

describe("LLM Retry and Fallback", () => {

  it("retries after a temporary provider failure", async () => {

    mockGroqCreate
      .mockRejectedValueOnce({
        status: 503,
      })
      .mockResolvedValueOnce(
        groqResponse()
      );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("groq");

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

  it("switches to Gemini after Groq exhausts its attempts", async () => {

    mockGroqCreate.mockRejectedValue({
      status: 503,
    });

    mockGeminiGenerate.mockResolvedValue(
      geminiResponse()
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("gemini");

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

    expect(mockGeminiGenerate)
      .toHaveBeenCalledTimes(1);

  });

  it("immediately switches providers after rate limiting", async () => {

    mockGroqCreate.mockRejectedValue({
      status: 429,
    });

    mockGeminiGenerate.mockResolvedValue(
      geminiResponse()
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("gemini");

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(1);

    expect(mockGeminiGenerate)
      .toHaveBeenCalledTimes(1);

  });

  it("does not use fallback when disabled", async () => {

    vi.stubEnv(
      "LLM_FALLBACK_ENABLED",
      "false"
    );

    mockGroqCreate.mockRejectedValue({
      status: 503,
    });

    await expect(
      generateLLMResponse(validRequest)
    ).rejects.toMatchObject({
      statusCode: 503,

      retryable: true,
    });

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

  it("returns a controlled error when both providers fail", async () => {

    mockGroqCreate.mockRejectedValue({
      status: 503,
    });

    mockGeminiGenerate.mockRejectedValue({
      status: 503,
    });

    await expect(
      generateLLMResponse(validRequest)
    ).rejects.toMatchObject({
      message:
        "Both AI providers failed to generate a response",

      statusCode: 503,

      retryable: true,
    });

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

    expect(mockGeminiGenerate)
      .toHaveBeenCalledTimes(2);

  });

  it("does not retry permanent authentication errors", async () => {

    mockGroqCreate.mockRejectedValue({
      status: 401,
    });

    await expect(
      generateLLMResponse(validRequest)
    ).rejects.toMatchObject({
      statusCode: 502,

      retryable: false,
    });

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(1);

    expect(mockGeminiGenerate)
      .not.toHaveBeenCalled();

  });

  it("classifies provider timeouts as retryable failures", async () => {

    mockGroqCreate
      .mockRejectedValueOnce({
        name: "APIConnectionTimeoutError",
      })
      .mockResolvedValueOnce(
        groqResponse()
      );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("groq");

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

  });

});

// =====================================
// AI OUTPUT VALIDATION TESTS
// =====================================

describe("LLM Output Validation", () => {

  it("retries after an empty AI response", async () => {

    mockGroqCreate
      .mockResolvedValueOnce(
        groqResponse("")
      )
      .mockResolvedValueOnce(
        groqResponse()
      );

    const result =
      await generateLLMResponse(validRequest);

    expect(JSON.parse(result.content))
      .toEqual(validContent);

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

  });

  it("retries after invalid JSON output", async () => {

    mockGroqCreate
      .mockResolvedValueOnce(
        groqResponse("Invalid JSON response")
      )
      .mockResolvedValueOnce(
        groqResponse()
      );

    const result =
      await generateLLMResponse(validRequest);

    expect(JSON.parse(result.content))
      .toEqual(validContent);

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

  });

  it("rejects JSON arrays instead of objects", async () => {

    vi.stubEnv(
      "LLM_FALLBACK_ENABLED",
      "false"
    );

    mockGroqCreate.mockResolvedValue(
      groqResponse("[1, 2, 3]")
    );

    await expect(
      generateLLMResponse(validRequest)
    ).rejects.toMatchObject({
      statusCode: 502,

      retryable: true,
    });

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

  });

  it("rejects truncated AI responses", async () => {

    vi.stubEnv(
      "LLM_FALLBACK_ENABLED",
      "false"
    );

    mockGroqCreate.mockResolvedValue(
      groqResponse(
        JSON.stringify(validContent),
        "length"
      )
    );

    await expect(
      generateLLMResponse(validRequest)
    ).rejects.toMatchObject({
      statusCode: 502,

      retryable: true,
    });

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

  });

  it("uses Gemini when Groq repeatedly returns invalid JSON", async () => {

    mockGroqCreate.mockResolvedValue(
      groqResponse("Invalid JSON")
    );

    mockGeminiGenerate.mockResolvedValue(
      geminiResponse()
    );

    const result =
      await generateLLMResponse(validRequest);

    expect(result.provider).toBe("gemini");

    expect(mockGroqCreate)
      .toHaveBeenCalledTimes(2);

    expect(mockGeminiGenerate)
      .toHaveBeenCalledTimes(1);

  });

});
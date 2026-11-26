import { vi } from "vitest";

// =====================================
// MOCK AI RESPONSE
// =====================================

export const mockGroqResponse = {
  content: "Java is an object-oriented programming language.",

  provider: "groq" as const,

  model: "mock-groq-model",
};

export const mockGeminiResponse = {
  content: "Java supports object-oriented programming.",

  provider: "gemini" as const,

  model: "mock-gemini-model",
};

// =====================================
// MOCK INTERVIEW QUESTION
// =====================================

export const mockInterviewQuestion = {
  question: "What is the difference between HashMap and ConcurrentHashMap?",

  category: "technical",

  topic: "Java Collections",

  difficulty: "intermediate",
};

// =====================================
// MOCK INTERVIEW EVALUATION
// =====================================

export const mockInterviewEvaluation = {
  scores: {
    accuracy: 85,

    relevance: 90,

    completeness: 80,

    clarity: 85,
  },

  overallScore: 85,

  feedback: "Good understanding of Java collections.",

  strengths: [
    "Clear explanation",
    "Correct technical concepts",
  ],

  weaknesses: [
    "Limited practical examples",
  ],

  missingKeyPoints: [
    "ConcurrentHashMap thread safety",
  ],

  improvementSuggestions: [
    "Explain concurrent access using practical examples",
  ],

  modelAnswer:
    "HashMap is not thread-safe, whereas ConcurrentHashMap supports concurrent access and updates.",

  recommendFollowUp: false,

  followUpFocus: "",
};

// =====================================
// MOCK LLM FUNCTION
// =====================================

export const mockGenerateLLMResponse = vi.fn();

// =====================================
// MOCK SCENARIO HELPERS
// =====================================

export const mockLLMSuccess = (): void => {
  mockGenerateLLMResponse.mockResolvedValue(
    mockGroqResponse
  );
};

export const mockLLMFallback = (): void => {
  mockGenerateLLMResponse.mockResolvedValue(
    mockGeminiResponse
  );
};

export const mockLLMFailure = (): void => {
  mockGenerateLLMResponse.mockRejectedValue(
    new Error("AI provider temporarily unavailable")
  );
};

export const mockLLMInvalidJSON = (): void => {
  mockGenerateLLMResponse.mockResolvedValue({
    ...mockGroqResponse,

    content: "This is not valid JSON",
  });
};

export const mockLLMEmptyResponse = (): void => {
  mockGenerateLLMResponse.mockResolvedValue({
    ...mockGroqResponse,

    content: "",
  });
};

export const mockLLMQuestionResponse = (): void => {
  mockGenerateLLMResponse.mockResolvedValue({
    ...mockGroqResponse,

    content: JSON.stringify(mockInterviewQuestion),
  });
};

export const mockLLMEvaluationResponse = (): void => {
  mockGenerateLLMResponse.mockResolvedValue({
    ...mockGroqResponse,

    content: JSON.stringify(mockInterviewEvaluation),
  });
};

export const resetLLMMocks = (): void => {
  mockGenerateLLMResponse.mockReset();
};
import {
  reserveAIQuota,
  AIQuotaError,
} from "./aiQuota.service.js";

import {
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

import {
  analyzePromptSecurity,
  protectSystemPrompt,
} from "../utils/promptSecurity.utils.js";

import {
  logger,
} from "../config/logger.config.js";

import {
  logAIGenerationStarted,
  logAIGenerationSuccess,
  logAIGenerationFailure,
  logAIProviderFallback,
  logAIPromptSecurity,
} from "../utils/aiLogger.utils.js";

import {
  recordAIUsage,
} from "./aiUsage.service.js";

import {
  emptyTokenUsage,
  extractGroqTokenUsage,
  extractGeminiTokenUsage,
} from "../utils/aiTokens.utils.js";

import type {
  AITokenUsage,
} from "../utils/aiTokens.utils.js";

import {
  getAIUsageContext,
} from "../utils/aiUsageContext.utils.js";

import type {
  AIUsageFeature,
} from "../config/aiUsage.config.js";

// =====================================
// TYPES
// =====================================

export type LLMProvider = "groq" | "gemini";

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;

  // Optional usage attribution.
  userId?: string | null;
  feature?: AIUsageFeature;
  requestId?: string | null;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
}

type TokenUsageCallback = (
  usage: AITokenUsage
) => void;

// =====================================
// CONFIGURATION
// =====================================

const llmLogger = logger.child({
  component: "llm-service",
});

const MAX_ATTEMPTS = 2;
const MAX_OUTPUT_TOKENS = 8192;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// =====================================
// CUSTOM ERROR
// =====================================

export class LLMError extends Error {

  constructor(
    message: string,
    public statusCode: number,
    public retryable = false
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// =====================================
// PROVIDER CLIENTS
// =====================================

let groqClient: Groq | null = null;

let geminiClient: GoogleGenAI | null = null;

const getGroqClient = (): Groq => {

  if (!process.env.GROQ_API_KEY) {
    throw new LLMError(
      "Groq API key is not configured",
      500
    );
  }

  if (!groqClient) {

    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });

  }

  return groqClient;
};

const getGeminiClient = (): GoogleGenAI => {

  if (!process.env.GEMINI_API_KEY) {
    throw new LLMError(
      "Gemini API key is not configured",
      500
    );
  }

  if (!geminiClient) {

    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,

      httpOptions: {
        timeout: REQUEST_TIMEOUT_MS,
      },
    });

  }

  return geminiClient;
};

// =====================================
// PROVIDER CONFIGURATION
// =====================================

export const getActiveProvider =
  (): LLMProvider => {

    const provider =
      process.env.LLM_PROVIDER || "groq";

    if (
      provider !== "groq" &&
      provider !== "gemini"
    ) {
      throw new LLMError(
        "Invalid primary LLM provider",
        500
      );
    }

    return provider;
  };

const getFallbackProvider =
  (): LLMProvider => {

    const provider =
      process.env.LLM_FALLBACK_PROVIDER ||
      "gemini";

    if (
      provider !== "groq" &&
      provider !== "gemini"
    ) {
      throw new LLMError(
        "Invalid fallback LLM provider",
        500
      );
    }

    return provider;
  };

const isFallbackEnabled = (): boolean =>
  process.env.LLM_FALLBACK_ENABLED === "true";

const getGroqModel = (): string =>
  process.env.GROQ_MODEL ||
  "openai/gpt-oss-20b";

const getGeminiModel = (): string =>
  process.env.GEMINI_MODEL ||
  "gemini-3.5-flash-lite";

const getProviderModel = (
  provider: LLMProvider
): string => {

  return provider === "groq"
    ? getGroqModel()
    : getGeminiModel();
};

// =====================================
// HELPER FUNCTIONS
// =====================================

const sleep = (
  milliseconds: number
): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const isProviderConfigured = (
  provider: LLMProvider
): boolean => {

  if (provider === "groq") {
    return Boolean(
      process.env.GROQ_API_KEY
    );
  }

  return Boolean(
    process.env.GEMINI_API_KEY
  );
};

// =====================================
// PROMPT SECURITY PROCESSING
// =====================================

const prepareSecureRequest = (
  request: LLMRequest
): LLMRequest => {

  const securityResult =
    analyzePromptSecurity(
      request.userPrompt
    );

  if (securityResult.suspicious) {

    logAIPromptSecurity(
      securityResult.riskLevel,
      securityResult.detectedPatterns
    );
  }

  return {
    ...request,

    systemPrompt: protectSystemPrompt(
      request.systemPrompt
    ),

    userPrompt: request.userPrompt,
  };
};

// =====================================
// JSON RESPONSE NORMALIZATION
// =====================================

const normalizeJSON = (
  content: string
): string => {

  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (!normalized) {

    throw new LLMError(
      "AI returned an empty response",
      502,
      true
    );
  }

  try {

    const parsed: unknown =
      JSON.parse(normalized);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Expected a JSON object"
      );
    }

    return JSON.stringify(parsed);

  } catch {

    throw new LLMError(
      "AI returned invalid JSON",
      502,
      true
    );
  }
};

// =====================================
// ERROR DIAGNOSTICS
// =====================================

interface ProviderErrorDetails {
  status: number;
  code?: string;
  type?: string;
  name?: string;
}

const getProviderErrorDetails = (
  error: unknown
): ProviderErrorDetails => {

  if (
    !error ||
    typeof error !== "object"
  ) {
    return {
      status: 500,
    };
  }

  const details = error as {

    status?: number | string;
    statusCode?: number;
    code?: string;
    type?: string;
    name?: string;

    error?: {

      code?: string;
      type?: string;
      status?: string;

      error?: {
        code?: string;
        type?: string;
      };
    };
  };

  const rawStatus = Number(
    details.status ??
    details.statusCode ??
    500
  );

  return {

    status: Number.isFinite(rawStatus)
      ? rawStatus
      : 500,

    code:
      details.error?.error?.code ??
      details.error?.code ??
      details.code,

    type:
      details.error?.error?.type ??
      details.error?.type ??
      details.type,

    name: details.name,
  };
};

// =====================================
// ERROR CLASSIFICATION
// =====================================

const classifyProviderError = (
  error: unknown
): LLMError => {

  if (error instanceof LLMError) {
    return error;
  }

  const {
    status,
    code,
    name,
  } = getProviderErrorDetails(error);

  if (code === "json_validate_failed") {

    return new LLMError(
      "AI failed to generate valid JSON",
      502,
      true
    );
  }

  if (
    name === "APIConnectionTimeoutError" ||
    name === "APIConnectionError" ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {

    return new LLMError(
      "AI provider connection timed out or failed",
      503,
      true
    );
  }

  if (status === 429) {

    return new LLMError(
      "AI provider rate limit reached",
      429,
      true
    );
  }

  if (status === 401 || status === 403) {

    return new LLMError(
      "AI provider authentication or permission failed",
      502
    );
  }

  if (status === 404) {

    return new LLMError(
      "Configured AI model was not found",
      502
    );
  }

  if (code === "context_length_exceeded") {

    return new LLMError(
      "AI input exceeds the model context limit",
      422
    );
  }

  if (status === 400) {

    return new LLMError(
      "AI provider rejected the request",
      502
    );
  }

  if (
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {

    return new LLMError(
      "AI provider is temporarily unavailable",
      503,
      true
    );
  }

  return new LLMError(
    "AI generation failed",
    502
  );
};

// =====================================
// GROQ GENERATION
// =====================================

const generateWithGroq = async (
  request: LLMRequest,
  attempt: number,
  onUsage: TokenUsageCallback
): Promise<LLMResponse> => {

  const client = getGroqClient();

  const model = getGroqModel();

  const systemPrompt = `
${request.systemPrompt}

OUTPUT REQUIREMENTS:

Return exactly one valid JSON object.

Do not include Markdown code fences.

Do not include explanatory text outside
the JSON object.

Use the required JSON structure.

Ensure all JSON strings, arrays and
objects are properly closed.

${attempt > 1
  ? `
A previous generation attempt failed.

Generate a concise, complete and valid
JSON object.

Do not omit required fields.
`
  : ""}
`;

  const completion =
    await client.chat.completions.create({

      model,

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: request.userPrompt,
        },
      ],

      response_format: {
        type: "json_object",
      },

      max_completion_tokens:
        MAX_OUTPUT_TOKENS,

      ...(model.startsWith("openai/gpt-oss-")
        ? {
            reasoning_effort: "low" as const,
          }
        : {}),

      stream: false,
    });

  // Capture usage before validating the response.
  // Failed JSON generation may still consume tokens.

  onUsage(
    extractGroqTokenUsage(
      completion.usage
    )
  );

  const choice =
    completion.choices[0];

  if (choice?.finish_reason === "length") {

    throw new LLMError(
      "AI response exceeded the output token limit",
      502,
      true
    );
  }

  const content =
    choice?.message?.content;

  if (!content?.trim()) {

    throw new LLMError(
      "Groq returned an empty response",
      502,
      true
    );
  }

  const normalizedContent =
    normalizeJSON(content);

  return {
    content: normalizedContent,
    provider: "groq",
    model,
  };
};

// =====================================
// GEMINI GENERATION
// =====================================

const generateWithGemini = async (
  request: LLMRequest,
  attempt: number,
  onUsage: TokenUsageCallback
): Promise<LLMResponse> => {

  const client = getGeminiClient();

  const model = getGeminiModel();

  const systemPrompt = `
${request.systemPrompt}

Return exactly one complete and valid
JSON object.

Do not include Markdown code fences or
additional explanatory text.

${attempt > 1
  ? `
Ensure that the JSON structure is
complete and all required fields exist.

Keep the response concise.
`
  : ""}
`;

  const response =
    await client.models.generateContent({

      model,

      contents: request.userPrompt,

      config: {
        systemInstruction: systemPrompt,

        responseMimeType:
          "application/json",

        maxOutputTokens:
          MAX_OUTPUT_TOKENS,
      },
    });

  // Capture Gemini token measurements.

  onUsage(
    extractGeminiTokenUsage(
      response.usageMetadata
    )
  );

  const finishReason =
    response.candidates?.[0]?.finishReason;

  if (finishReason === "MAX_TOKENS") {

    throw new LLMError(
      "Gemini response exceeded the output token limit",
      502,
      true
    );
  }

  const content = response.text;

  if (!content?.trim()) {

    throw new LLMError(
      "Gemini returned an empty response",
      502,
      true
    );
  }

  const normalizedContent =
    normalizeJSON(content);

  return {
    content: normalizedContent,
    provider: "gemini",
    model,
  };
};

// =====================================
// PROVIDER ATTEMPT USAGE TRACKING
// =====================================

interface AttemptUsageInput {
  request: LLMRequest;
  provider: LLMProvider;
  model: string;
  usage: AITokenUsage;
  outcome: "success" | "failure";
  durationMs: number;
  isFallback: boolean;
}

const trackProviderAttempt = (
  input: AttemptUsageInput
): void => {

  const context =
    getAIUsageContext();

  void recordAIUsage({

    userId:
      input.request.userId ??
      context.userId ??
      null,

    feature:
      input.request.feature ??
      context.feature,

    requestId:
      input.request.requestId ??
      context.requestId ??
      null,

    provider: input.provider,

    model: input.model,

    inputTokens:
      input.usage.inputTokens,

    outputTokens:
      input.usage.outputTokens,

    totalTokens:
      input.usage.totalTokens,

    outcome: input.outcome,

    durationMs: input.durationMs,

    isFallback: input.isFallback,

  }).catch(() => {

    // Usage analytics must not interrupt
    // the main AI generation workflow.

  });
};

// =====================================
// PROVIDER RETRY MECHANISM
// =====================================

const generateWithProvider = async (
  provider: LLMProvider,
  request: LLMRequest,
  isFallback = false
): Promise<LLMResponse> => {

  let lastError: LLMError | null = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {

    const startedAt = Date.now();

    const model =
      getProviderModel(provider);

    let tokenUsage =
      emptyTokenUsage();

    const captureUsage = (
      usage: AITokenUsage
    ): void => {

      tokenUsage = usage;
    };

    // Enforce quota before contacting the AI provider.

    const context = getAIUsageContext();

    const quotaUserId =
      request.userId ?? context.userId;

    const quotaFeature =
      request.feature ??
      context.feature ??
      AI_USAGE_FEATURES.UNKNOWN;

    if (quotaUserId) {
      try {
        await reserveAIQuota(
          quotaUserId,
          quotaFeature
        );
      } catch (error) {
        if (error instanceof AIQuotaError) {
          throw new LLMError(
            error.message,
            error.statusCode,
            false
          );
        }

        throw error;
      }
    }

    logAIGenerationStarted(
      provider,
      model,
      attempt
    );

    try {

      const response =
        provider === "groq"

          ? await generateWithGroq(
              request,
              attempt,
              captureUsage
            )

          : await generateWithGemini(
              request,
              attempt,
              captureUsage
            );

      const durationMs =
        Date.now() - startedAt;

      trackProviderAttempt({

        request,

        provider,

        model: response.model,

        usage: tokenUsage,

        outcome: "success",

        durationMs,

        isFallback,

      });

      logAIGenerationSuccess(
        provider,
        response.model,
        durationMs
      );

      return response;

    } catch (error) {

      const classifiedError =
        classifyProviderError(error);

      lastError = classifiedError;

      trackProviderAttempt({

        request,

        provider,

        model,

        usage: tokenUsage,

        outcome: "failure",

        durationMs:
          Date.now() - startedAt,

        isFallback,

      });

      logAIGenerationFailure(
        provider,
        classifiedError.statusCode,
        classifiedError.retryable,
        attempt
      );

      // Do not retry permanent errors.

      if (!classifiedError.retryable) {

        throw classifiedError;
      }

      // Avoid immediately retrying
      // rate-limited requests.

      if (classifiedError.statusCode === 429) {

        throw classifiedError;
      }

      if (attempt < MAX_ATTEMPTS) {

        const delay =
          RETRY_DELAY_MS * attempt;

        llmLogger.info(
          {
            event: "AI_GENERATION_RETRY",
            provider,
            model,
            nextAttempt: attempt + 1,
            delayMs: delay,
          },
          "Retrying AI generation"
        );

        await sleep(delay);
      }
    }
  }

  throw (
    lastError ||
    new LLMError(
      "AI generation failed",
      503,
      true
    )
  );
};

// =====================================
// MAIN LLM SERVICE
// =====================================

export const generateLLMResponse = async (
  request: LLMRequest
): Promise<LLMResponse> => {

  const startedAt = Date.now();

  if (
    !request.systemPrompt?.trim() ||
    !request.userPrompt?.trim()
  ) {

    throw new LLMError(
      "System prompt and user prompt are required",
      400
    );
  }

  const secureRequest =
    prepareSecureRequest(request);

  const primaryProvider =
    getActiveProvider();

  const fallbackProvider =
    getFallbackProvider();

  const fallbackEnabled =
    isFallbackEnabled();

  try {

    const response =
      await generateWithProvider(
        primaryProvider,
        secureRequest,
        false
      );

    llmLogger.info(
      {
        event: "AI_REQUEST_COMPLETED",
        provider: response.provider,
        model: response.model,
        fallbackUsed: false,
        totalDurationMs:
          Date.now() - startedAt,
      },
      "AI request completed"
    );

    return response;

  } catch (error) {

    const primaryError =
      classifyProviderError(error);

    const canUseFallback =
      fallbackEnabled &&
      fallbackProvider !== primaryProvider &&
      isProviderConfigured(fallbackProvider) &&
      primaryError.retryable;

    llmLogger.warn(
      {
        event: "AI_PRIMARY_PROVIDER_FAILED",

        provider: primaryProvider,

        statusCode:
          primaryError.statusCode,

        retryable:
          primaryError.retryable,

        fallbackAvailable:
          canUseFallback,
      },
      "Primary AI provider failed"
    );

    if (!canUseFallback) {

      llmLogger.error(
        {
          event: "AI_REQUEST_FAILED",

          provider: primaryProvider,

          statusCode:
            primaryError.statusCode,

          totalDurationMs:
            Date.now() - startedAt,
        },
        "AI request failed"
      );

      throw primaryError;
    }

    logAIProviderFallback(
      primaryProvider,
      fallbackProvider
    );

    try {

      const response =
        await generateWithProvider(
          fallbackProvider,
          secureRequest,
          true
        );

      llmLogger.info(
        {
          event: "AI_REQUEST_COMPLETED",

          provider: response.provider,

          model: response.model,

          fallbackUsed: true,

          totalDurationMs:
            Date.now() - startedAt,
        },
        "AI request completed using fallback provider"
      );

      return response;

    } catch (fallbackError) {

      const classifiedFallbackError =
        classifyProviderError(
          fallbackError
        );

      llmLogger.error(
        {
          event: "AI_ALL_PROVIDERS_FAILED",

          primaryProvider,

          fallbackProvider,

          statusCode:
            classifiedFallbackError.statusCode,

          retryable:
            classifiedFallbackError.retryable,

          totalDurationMs:
            Date.now() - startedAt,
        },
        "Both AI providers failed"
      );

      throw new LLMError(
        "Both AI providers failed to generate a response",
        classifiedFallbackError.statusCode,
        classifiedFallbackError.retryable
      );
    }
  }
};
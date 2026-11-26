import { Types } from "mongoose";

import AIUsage from "../models/aiUsage.model.js";

import {
  AI_USAGE_CONFIG,
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

import type {
  AIUsageProvider,
  AIUsageFeature,
} from "../config/aiUsage.config.js";

import {
  calculateEstimatedAICost,
} from "../utils/aiPricing.utils.js";

import {
  logger,
} from "../config/logger.config.js";

// =====================================
// USAGE INPUT
// =====================================

export interface RecordAIUsageInput {

  userId?: string | null;

  provider: AIUsageProvider;

  model: string;

  feature?: AIUsageFeature;

  inputTokens?: number | null;

  outputTokens?: number | null;

  totalTokens?: number | null;

  outcome: "success" | "failure";

  durationMs: number;

  isFallback?: boolean;

  requestId?: string | null;

}

// =====================================
// USAGE LOGGER
// =====================================

const usageLogger = logger.child({
  component: "ai-usage",
});

// =====================================
// VALIDATE TOKEN COUNT
// =====================================

const normalizeTokenCount = (
  value: unknown
): number | null => {

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;

};

// =====================================
// RECORD AI PROVIDER USAGE
// =====================================

export const recordAIUsage = async (
  input: RecordAIUsageInput
): Promise<void> => {

  if (!AI_USAGE_CONFIG.enabled) {
    return;
  }

  try {

    if (
      !["groq", "gemini"].includes(input.provider)
    ) {
      return;
    }

    if (
      typeof input.model !== "string" ||
      !input.model.trim() ||
      input.model.length > 150
    ) {
      return;
    }

    if (
      !["success", "failure"].includes(input.outcome)
    ) {
      return;
    }

    if (
      !Number.isFinite(input.durationMs) ||
      input.durationMs < 0
    ) {
      return;
    }

    // Normalize user identifier.

    const userId =

      typeof input.userId === "string" &&
      /^[a-fA-F0-9]{24}$/.test(input.userId)

        ? new Types.ObjectId(input.userId)

        : null;

    // Normalize token measurements.

    const inputTokens =
      normalizeTokenCount(input.inputTokens);

    const outputTokens =
      normalizeTokenCount(input.outputTokens);

    let totalTokens =
      normalizeTokenCount(input.totalTokens);

    // Derive total only when both
    // component measurements are available.

    if (
      totalTokens === null &&
      inputTokens !== null &&
      outputTokens !== null
    ) {

      totalTokens = normalizeTokenCount(
        inputTokens + outputTokens
      );

    }

    // Calculate estimated monetary cost.

    const estimatedCostUsd =
      calculateEstimatedAICost({

        provider: input.provider,

        model: input.model,

        inputTokens,

        outputTokens,

      });

    // Validate feature attribution.

    const feature =

      input.feature &&
      Object.values(AI_USAGE_FEATURES)
        .includes(input.feature)

        ? input.feature

        : AI_USAGE_FEATURES.UNKNOWN;

    // Validate request identifier.

    const requestId =

      typeof input.requestId === "string" &&

      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
        .test(input.requestId)

        ? input.requestId

        : null;

    // Persist usage metadata.

    await AIUsage.create({

      userId,

      provider: input.provider,

      model: input.model,

      feature,

      inputTokens,

      outputTokens,

      totalTokens,

      estimatedCostUsd,

      outcome: input.outcome,

      durationMs:
        Math.round(input.durationMs),

      isFallback:
        input.isFallback === true,

      requestId,

      createdAt: new Date(),

    });

  } catch (error) {

    // Analytics failures must not
    // interrupt AI functionality.

    usageLogger.warn({

      event: "AI_USAGE_RECORDING_FAILED",

      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",

    });

  }

};
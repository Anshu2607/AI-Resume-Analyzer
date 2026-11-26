import {
  AI_USAGE_CONFIG,
} from "../config/aiUsage.config.js";

import type {
  AIUsageProvider,
} from "../config/aiUsage.config.js";

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

interface CalculateCostInput {
  provider: AIUsageProvider;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

// Load pricing from environment configuration.
// Unknown model prices remain unavailable.

const getModelPricing = (
  provider: AIUsageProvider,
  model: string
): ModelPricing | null => {

  try {

    const raw =
      process.env.AI_MODEL_PRICING_JSON;

    if (!raw) {
      return null;
    }

    const pricing = JSON.parse(raw);

    const key = `${provider}:${model}`;

    if (
      !pricing ||
      typeof pricing !== "object" ||
      !Object.hasOwn(pricing, key)
    ) {
      return null;
    }

    const rate = pricing[key];

    if (
      !rate ||
      typeof rate.inputPerMillion !== "number" ||
      typeof rate.outputPerMillion !== "number" ||
      !Number.isFinite(rate.inputPerMillion) ||
      !Number.isFinite(rate.outputPerMillion) ||
      rate.inputPerMillion < 0 ||
      rate.outputPerMillion < 0
    ) {
      return null;
    }

    return {
      inputPerMillion: rate.inputPerMillion,
      outputPerMillion: rate.outputPerMillion,
    };

  } catch {

    return null;

  }

};

// =====================================
// CALCULATE ESTIMATED AI COST
// =====================================

export const calculateEstimatedAICost = (
  input: CalculateCostInput
): number | null => {

  const {
    provider,
    model,
    inputTokens,
    outputTokens,
  } = input;

  if (
    inputTokens === null ||
    outputTokens === null ||
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    return null;
  }

  const pricing =
    getModelPricing(provider, model);

  if (!pricing) {
    return null;
  }

  const units =
    AI_USAGE_CONFIG.pricing.tokensPerUnit;

  const inputCost =
    (inputTokens / units) *
    pricing.inputPerMillion;

  const outputCost =
    (outputTokens / units) *
    pricing.outputPerMillion;

  const totalCost = inputCost + outputCost;

  if (!Number.isFinite(totalCost)) {
    return null;
  }

  return Number(totalCost.toFixed(10));

};
import {
  AI_USAGE_FEATURES,
} from "./aiUsage.config.js";

import type {
  AIUsageFeature,
} from "./aiUsage.config.js";

export const AI_QUOTA_CONFIG = {

  enabled:
    process.env.AI_QUOTA_ENABLED !== "false",

  keyPrefix: "careerlens:ai-quota:v1",

  timezone: "UTC",

  dailyTotalAttemptLimit: 150,

  featureLimits: {

    [AI_USAGE_FEATURES.RESUME_ANALYSIS]: 10,

    [AI_USAGE_FEATURES.RAG_ASSISTANT]: 30,

    [AI_USAGE_FEATURES.JOB_MATCHING]: 15,

    [AI_USAGE_FEATURES.CAREER_ROADMAP]: 5,

    [AI_USAGE_FEATURES.AGENT_EXECUTION]: 10,

    [AI_USAGE_FEATURES.INTERVIEW_QUESTION]: 30,

    [AI_USAGE_FEATURES.INTERVIEW_EVALUATION]: 30,

    [AI_USAGE_FEATURES.INTERVIEW_REPORT]: 5,

    [AI_USAGE_FEATURES.UNKNOWN]: 10,

  } satisfies Record<AIUsageFeature, number>,

} as const;

export const getFeatureQuotaLimit = (
  feature: AIUsageFeature
): number => {

  return AI_QUOTA_CONFIG.featureLimits[feature];
};
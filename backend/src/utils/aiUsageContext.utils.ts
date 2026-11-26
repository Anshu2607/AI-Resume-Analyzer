import {
  AsyncLocalStorage,
} from "node:async_hooks";

import type {
  AIUsageFeature,
} from "../config/aiUsage.config.js";

export interface AIUsageContext {
  userId?: string | null;
  feature?: AIUsageFeature;
  requestId?: string | null;
}

const aiUsageStorage =
  new AsyncLocalStorage<AIUsageContext>();

export const runWithAIUsageContext = <T>(
  context: AIUsageContext,
  callback: () => T
): T => {

  const existingContext =
    aiUsageStorage.getStore();

  return aiUsageStorage.run(
    {
      ...existingContext,
      ...context,
    },
    callback
  );
};

export const getAIUsageContext =
  (): AIUsageContext => {

    return aiUsageStorage.getStore() ?? {};
  };
export interface AITokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

interface GroqUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

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

export const emptyTokenUsage = (): AITokenUsage => ({
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
});

export const extractGroqTokenUsage = (
  usage?: GroqUsage | null
): AITokenUsage => {

  return {
    inputTokens:
      normalizeTokenCount(usage?.prompt_tokens),

    outputTokens:
      normalizeTokenCount(usage?.completion_tokens),

    totalTokens:
      normalizeTokenCount(usage?.total_tokens),
  };
};

export const extractGeminiTokenUsage = (
  usage?: GeminiUsage | null
): AITokenUsage => {

  const candidateTokens =
    normalizeTokenCount(
      usage?.candidatesTokenCount
    );

  const thoughtTokens =
    normalizeTokenCount(
      usage?.thoughtsTokenCount
    );

  const outputTokens =
    candidateTokens === null
      ? null
      : normalizeTokenCount(
          candidateTokens + (thoughtTokens ?? 0)
        );

  return {
    inputTokens:
      normalizeTokenCount(usage?.promptTokenCount),

    outputTokens,

    totalTokens:
      normalizeTokenCount(usage?.totalTokenCount),
  };
};
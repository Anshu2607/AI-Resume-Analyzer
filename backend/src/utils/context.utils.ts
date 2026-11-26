import type {
  SearchResult,
} from "../services/vectorSearch.service.js";

import type {
  RAGSource,
} from "../prompts/rag.prompt.js";

export const CONTEXT_CONFIG = {
  maxSources: 10,
  maxContextCharacters: 12000,
} as const;

// Build context from retrieved document chunks
export const buildRetrievedContext = (
  results: SearchResult[]
): RAGSource[] => {

  const sources: RAGSource[] = [];

  const seenChunks = new Set<string>();

  let totalCharacters = 0;

  // Prioritize the most relevant chunks
  const sortedResults = [...results].sort(
    (a, b) => b.score - a.score
  );

  for (const result of sortedResults) {

    if (
      sources.length >=
      CONTEXT_CONFIG.maxSources
    ) {
      break;
    }

    const chunkId = result._id.toString();

    // Prevent duplicate chunks
    if (seenChunks.has(chunkId)) {
      continue;
    }

    const content = result.content.trim();

    if (!content) {
      continue;
    }

    // Enforce context size limit
    if (
      totalCharacters + content.length >
      CONTEXT_CONFIG.maxContextCharacters
    ) {
      continue;
    }

    sources.push({
      sourceId: `S${sources.length + 1}`,

      chunkIndex: result.chunkIndex,

      content,

      score: result.score,
    });

    seenChunks.add(chunkId);

    totalCharacters += content.length;
  }

  return sources;
};

// Normalize whitespace for evidence comparison
const normalizeText = (text: string): string => {
  return text
    .replace(/\s+/g, " ")
    .trim();
};

// Verify that cited evidence exists in the source
export const validateSourceEvidence = (
  sourceId: string,
  evidence: string,
  sources: RAGSource[]
): boolean => {

  const source = sources.find(
    (item) => item.sourceId === sourceId
  );

  if (!source) {
    return false;
  }

  const normalizedEvidence =
    normalizeText(evidence);

  if (!normalizedEvidence) {
    return false;
  }

  return normalizeText(
    source.content
  ).includes(normalizedEvidence);
};
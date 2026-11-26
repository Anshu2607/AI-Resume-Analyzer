import {
  generateEmbeddings,
} from "./embedding.service.js";

import {
  chunkDocument,
} from "./chunking.service.js";

export const SIMILARITY_VERSION = "1.0.0";

export class SimilarityError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "SimilarityError";
  }
}

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {

  if (
    vectorA.length === 0 ||
    vectorA.length !== vectorB.length
  ) {
    throw new SimilarityError(
      "Invalid vector dimensions",
      400
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {

    if (
      !Number.isFinite(vectorA[i]) ||
      !Number.isFinite(vectorB[i])
    ) {
      throw new SimilarityError(
        "Invalid vector values",
        400
      );
    }

    dotProduct += vectorA[i] * vectorB[i];

    magnitudeA += vectorA[i] ** 2;

    magnitudeB += vectorB[i] ** 2;
  }

  const denominator =
    Math.sqrt(magnitudeA) *
    Math.sqrt(magnitudeB);

  if (denominator === 0) {
    throw new SimilarityError(
      "Cannot compare zero-magnitude vectors",
      400
    );
  }

  const similarity =
    dotProduct / denominator;

  return Math.max(
    -1,
    Math.min(1, similarity)
  );
};

// Convert similarity into a heuristic score
export const normalizeSimilarity = (
  similarity: number
): number => {

  return Math.round(
    Math.max(
      0,
      Math.min(1, similarity)
    ) * 100
  );
};

interface SimilarityInput {
  resumeText: string;
  jobDescription: string;
}

// Compare resume and job description chunks
export const calculateSemanticSimilarity = async ({
  resumeText,
  jobDescription,
}: SimilarityInput) => {

  const startTime = Date.now();

  if (
    !resumeText.trim() ||
    !jobDescription.trim()
  ) {
    throw new SimilarityError(
      "Resume and job description are required",
      400
    );
  }

  // Split both documents into smaller chunks
  const [resumeChunks, jobChunks] =
    await Promise.all([
      chunkDocument(resumeText),
      chunkDocument(jobDescription),
    ]);

  if (
    resumeChunks.length === 0 ||
    jobChunks.length === 0
  ) {
    throw new SimilarityError(
      "Unable to generate document chunks",
      422
    );
  }

  // Generate embeddings locally
  const allEmbeddings =
    await generateEmbeddings([
      ...resumeChunks.map(
        (chunk) => chunk.content
      ),

      ...jobChunks.map(
        (chunk) => chunk.content
      ),
    ]);

  const resumeEmbeddings =
    allEmbeddings.slice(
      0,
      resumeChunks.length
    );

  const jobEmbeddings =
    allEmbeddings.slice(
      resumeChunks.length
    );

  if (
    resumeEmbeddings.length !==
      resumeChunks.length ||
    jobEmbeddings.length !==
      jobChunks.length
  ) {
    throw new SimilarityError(
      "Embedding generation was incomplete",
      503
    );
  }

  // Find the best resume match for each job chunk
  const chunkMatches = jobEmbeddings.map(
    (jobVector, jobIndex) => {

      let bestSimilarity = -1;

      let bestResumeChunkIndex = -1;

      resumeEmbeddings.forEach(
        (resumeVector, resumeIndex) => {

          const similarity =
            cosineSimilarity(
              jobVector,
              resumeVector
            );

          if (similarity > bestSimilarity) {

            bestSimilarity = similarity;

            bestResumeChunkIndex =
              resumeIndex;
          }
        }
      );

      return {
        jobChunkIndex: jobIndex,

        resumeChunkIndex:
          bestResumeChunkIndex,

        similarity: bestSimilarity,

        score: normalizeSimilarity(
          bestSimilarity
        ),
      };
    }
  );

  // Average best-match scores across job chunks
  const averageSimilarity =
    chunkMatches.reduce(
      (sum, match) =>
        sum + Math.max(0, match.similarity),
      0
    ) / chunkMatches.length;

  const semanticScore =
    normalizeSimilarity(
      averageSimilarity
    );

  const processingTime =
    Date.now() - startTime;

  console.log(
    "Semantic similarity completed"
  );

  console.log(
    "Semantic score:",
    semanticScore
  );

  console.log(
    "Processing time:",
    processingTime,
    "ms"
  );

  return {
    semanticScore,

    averageSimilarity:
      Number(averageSimilarity.toFixed(4)),

    resumeChunkCount:
      resumeChunks.length,

    jobChunkCount:
      jobChunks.length,

    chunkMatches,

    similarityVersion:
      SIMILARITY_VERSION,

    processingTime,
  };
};
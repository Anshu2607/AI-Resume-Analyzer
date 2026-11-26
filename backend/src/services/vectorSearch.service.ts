import mongoose, { Types } from "mongoose";

import Resume from "../models/resume.model.js";
import DocumentChunk from "../models/documentChunk.model.js";

import {
  generateEmbedding,
  getEmbeddingModel,
  EMBEDDING_VERSION,
} from "./embedding.service.js";

import {
  CHUNKING_VERSION,
} from "./chunking.service.js";

// Custom vector search error
export class VectorSearchError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "VectorSearchError";
  }
}

// Search result interface
export interface SearchResult {
  _id: Types.ObjectId;
  resumeId: Types.ObjectId;
  chunkIndex: number;
  content: string;
  characterCount: number;
  score: number;
}

// Semantic search request interface
interface SemanticSearchInput {
  userId: string;
  resumeId: string;
  query: string;
  limit?: number;
}

// Retrieve configured Atlas vector index
const getVectorIndexName = (): string => {
  return (
    process.env.VECTOR_SEARCH_INDEX ||
    "resume_vector_index"
  );
};

// Perform semantic search
export const semanticSearch = async ({
  userId,
  resumeId,
  query,
  limit = 5,
}: SemanticSearchInput) => {

  const startTime = Date.now();

  // Validate user ID
  if (!mongoose.isValidObjectId(userId)) {
    throw new VectorSearchError(
      "Invalid user ID",
      400
    );
  }

  // Validate resume ID
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new VectorSearchError(
      "Invalid resume ID",
      400
    );
  }

  // Validate search query
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new VectorSearchError(
      "Search query cannot be empty",
      400
    );
  }

  if (normalizedQuery.length > 1000) {
    throw new VectorSearchError(
      "Search query must not exceed 1000 characters",
      400
    );
  }

  // Validate result limit
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 20
  ) {
    throw new VectorSearchError(
      "Search limit must be between 1 and 20",
      400
    );
  }

  const userObjectId =
    new Types.ObjectId(userId);

  const resumeObjectId =
    new Types.ObjectId(resumeId);

  // Verify resume ownership
  const resumeExists = await Resume.exists({
    _id: resumeObjectId,
    userId: userObjectId,
    status: "processed",
  });

  if (!resumeExists) {
    throw new VectorSearchError(
      "Resume not found or not processed",
      404
    );
  }

  // Filter compatible document chunks
  const filters = {
    userId: userObjectId,

    resumeId: resumeObjectId,

    embeddingModel: getEmbeddingModel(),

    embeddingVersion: EMBEDDING_VERSION,

    chunkingVersion: CHUNKING_VERSION,
  };

  // Verify that resume embeddings exist
  const indexedChunks =
    await DocumentChunk.countDocuments(filters);

  if (indexedChunks === 0) {
    throw new VectorSearchError(
      "Resume must be indexed before semantic search",
      409
    );
  }

  // Generate query embedding
  let queryVector: number[];

  try {
    queryVector = await generateEmbedding(
      normalizedQuery
    );
  } catch (error) {

    console.error(
      "Query embedding failed:",
      error instanceof Error
        ? error.name
        : "Unknown error"
    );

    throw new VectorSearchError(
      "Unable to generate query embedding",
      503
    );
  }

  // Execute Atlas Vector Search
  let results: SearchResult[];

  try {

    results =
      await DocumentChunk.aggregate<SearchResult>([
        {
          $vectorSearch: {
            index: getVectorIndexName(),

            path: "embedding",

            queryVector,

            numCandidates: Math.max(
              100,
              limit * 20
            ),

            limit,

            filter: filters,
          },
        },

        // Additional ownership and compatibility check
        {
          $match: filters,
        },

        // Return relevant fields only
        {
          $project: {
            _id: 1,

            resumeId: 1,

            chunkIndex: 1,

            content: 1,

            characterCount: 1,

            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ]);

  } catch (error) {

    console.error(
      "Vector search failed:",
      error instanceof Error
        ? error.name
        : "Unknown error"
    );

    throw new VectorSearchError(
      "Vector search is temporarily unavailable",
      503
    );
  }

  const processingTime =
    Date.now() - startTime;

  console.log(
    "Semantic search completed"
  );

  console.log(
    "Results retrieved:",
    results.length
  );

  console.log(
    "Processing time:",
    processingTime,
    "ms"
  );

  return {
    resumeId,

    query: normalizedQuery,

    count: results.length,

    embeddingModel: getEmbeddingModel(),

    processingTime,

    results,
  };
};
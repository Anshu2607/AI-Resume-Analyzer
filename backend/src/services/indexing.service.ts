import mongoose from "mongoose";

import Resume from "../models/resume.model.js";
import DocumentChunk from "../models/documentChunk.model.js";

import {
  chunkDocument,
  CHUNKING_VERSION,
} from "./chunking.service.js";

import {
  generateEmbeddings,
  getEmbeddingModel,
  getEmbeddingDimensions,
  EMBEDDING_VERSION,
} from "./embedding.service.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

export class IndexingError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "IndexingError";
  }
}

// Generate and store resume embeddings
export const indexResume = async (
  userId: string,
  resumeId: string
) => {
  const startTime = Date.now();

  // Validate resume ID
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new IndexingError(
      "Invalid resume ID",
      400
    );
  }

  // Retrieve resume and verify ownership
  const resume = await Resume.findOne({
    _id: resumeId,
    userId,
  }).select("+extractedText");

  if (!resume) {
    throw new IndexingError(
      "Resume not found",
      404
    );
  }

  if (
    resume.status !== "processed" ||
    !resume.extractedText
  ) {
    throw new IndexingError(
      "Resume is not ready for indexing",
      422
    );
  }

  // Reduce unnecessary personal information
  const sanitizedText =
    redactPersonalInformation(
      resume.extractedText
    );

  if (sanitizedText.length < 30) {
    throw new IndexingError(
      "Insufficient content for indexing",
      422
    );
  }

  if (sanitizedText.length > 50000) {
    throw new IndexingError(
      "Document exceeds the indexing limit",
      422
    );
  }

  // Verify compatibility with vector dimensions
  const dimensions = getEmbeddingDimensions();

  if (dimensions !== 384) {
    throw new IndexingError(
      "Embedding configuration must use 384 dimensions",
      500
    );
  }

  console.log("Starting resume indexing");

  // Step 1: Split resume into chunks
  const chunks = await chunkDocument(
    sanitizedText
  );

  if (chunks.length === 0) {
    throw new IndexingError(
      "No document chunks generated",
      422
    );
  }

  console.log(
    "Document chunks generated:",
    chunks.length
  );

  // Step 2: Generate embeddings in batches
  let embeddings: number[][];

  try {
    embeddings = await generateEmbeddings(
      chunks.map((chunk) => chunk.content)
    );
  } catch {
    console.error("Embedding generation failed");

    throw new IndexingError(
      "Unable to generate document embeddings",
      503
    );
  }

  if (embeddings.length !== chunks.length) {
    throw new IndexingError(
      "Chunk and embedding count mismatch",
      500
    );
  }

  console.log(
    "Embeddings generated:",
    embeddings.length
  );

  // Step 3: Prepare MongoDB documents
  const documents = chunks.map(
    (chunk, index) => ({
      userId,
      resumeId,

      chunkIndex: chunk.chunkIndex,

      content: chunk.content,

      characterCount: chunk.characterCount,

      embedding: embeddings[index],

      embeddingModel: getEmbeddingModel(),

      embeddingDimensions: dimensions,

      embeddingVersion: EMBEDDING_VERSION,

      chunkingVersion: CHUNKING_VERSION,
    })
  );

  // Step 4: Replace existing chunks atomically
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {

      // Ensure resume still exists
      const resumeExists = await Resume.exists({
        _id: resumeId,
        userId,
      }).session(session);

      if (!resumeExists) {
        throw new IndexingError(
          "Resume no longer exists",
          404
        );
      }

      // Remove previous embeddings
      await DocumentChunk.deleteMany(
        {
          userId,
          resumeId,
        },
        {
          session,
        }
      );

      // Store new chunks and embeddings
      await DocumentChunk.insertMany(
        documents,
        {
          session,
          ordered: true,
        }
      );
    });
  } finally {
    await session.endSession();
  }

  const processingTime =
    Date.now() - startTime;

  console.log("Resume indexed successfully");

  console.log(
    "Processing time:",
    processingTime,
    "ms"
  );

  return {
    resumeId,
    status: "indexed",
    chunkCount: chunks.length,
    embeddingModel: getEmbeddingModel(),
    embeddingDimensions: dimensions,
    processingTime,
  };
};

// Retrieve resume indexing information
export const getIndexingStatus = async (
  userId: string,
  resumeId: string
) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new IndexingError(
      "Invalid resume ID",
      400
    );
  }

  const resumeExists = await Resume.exists({
    _id: resumeId,
    userId,
  });

  if (!resumeExists) {
    throw new IndexingError(
      "Resume not found",
      404
    );
  }

  const [chunkCount, latestChunk] =
    await Promise.all([
      DocumentChunk.countDocuments({
        userId,
        resumeId,
      }),

      DocumentChunk.findOne({
        userId,
        resumeId,
      })
        .sort({ createdAt: -1 })
        .select(
          "embeddingModel embeddingDimensions embeddingVersion chunkingVersion createdAt"
        )
        .lean(),
    ]);

  return {
    resumeId,

    indexed: chunkCount > 0,

    chunkCount,

    embeddingModel:
      latestChunk?.embeddingModel || null,

    embeddingDimensions:
      latestChunk?.embeddingDimensions || null,

    embeddingVersion:
      latestChunk?.embeddingVersion || null,

    chunkingVersion:
      latestChunk?.chunkingVersion || null,

    indexedAt:
      latestChunk?.createdAt || null,
  };
};

// Remove stored resume embeddings
export const removeResumeIndex = async (
  userId: string,
  resumeId: string
) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new IndexingError(
      "Invalid resume ID",
      400
    );
  }

  const result = await DocumentChunk.deleteMany({
    userId,
    resumeId,
  });

  return {
    resumeId,
    deletedChunks: result.deletedCount,
    message: "Resume index removed successfully",
  };
};
import {
  pipeline,
  env,
} from "@huggingface/transformers";

import type {
  FeatureExtractionPipeline,
} from "@huggingface/transformers";

import path from "node:path";

import {
  mkdir,
  access,
} from "node:fs/promises";

import {
  constants,
} from "node:fs";

// =====================================
// MODEL CACHE CONFIGURATION
// =====================================

const cacheDirectory = path.resolve(
  process.env.EMBEDDING_CACHE_DIR ||
  process.env.HF_HOME ||
  "./.cache/transformers"
);

env.cacheDir = cacheDirectory;

// Use the filesystem cache in Node.js.

env.useBrowserCache = false;

env.useFSCache = true;

// =====================================
// EMBEDDING CONFIGURATION
// =====================================

export const EMBEDDING_VERSION = "1.0.0";

export const getEmbeddingModel = (): string => {

  return (
    process.env.EMBEDDING_MODEL ||
    "Xenova/all-MiniLM-L6-v2"
  );

};

export const getEmbeddingDimensions = (): number => {

  return Number(
    process.env.EMBEDDING_DIMENSIONS || 384
  );

};

// =====================================
// REUSABLE EMBEDDING MODEL
// =====================================

let extractorPromise:
  Promise<FeatureExtractionPipeline> | null = null;

// =====================================
// INITIALIZE MODEL CACHE DIRECTORY
// =====================================

const initializeCacheDirectory =
  async (): Promise<void> => {

    await mkdir(
      cacheDirectory,
      {
        recursive: true,
      }
    );

    await access(
      cacheDirectory,
      constants.R_OK | constants.W_OK
    );

    console.log(
      "Embedding cache directory:",
      cacheDirectory
    );

  };

// =====================================
// INITIALIZE EMBEDDING MODEL
// =====================================

const getExtractor =
  async (): Promise<FeatureExtractionPipeline> => {

    if (!extractorPromise) {

      extractorPromise = (async () => {

        await initializeCacheDirectory();

        console.log(
          "Loading embedding model:",
          getEmbeddingModel()
        );

        const extractor = await pipeline(

          "feature-extraction",

          getEmbeddingModel(),

          {
            device: "cpu",

            dtype: "q8",

            cache_dir: cacheDirectory,
          }

        );

        console.log(
          "Embedding model loaded successfully"
        );

        return extractor;

      })().catch((error: unknown) => {

        extractorPromise = null;

        console.error(
          "Embedding model initialization failed:",
          error instanceof Error
            ? error.name
            : "UnknownError"
        );

        throw error;

      });

    }

    return extractorPromise;

  };

// =====================================
// VALIDATE GENERATED EMBEDDING
// =====================================

const validateEmbedding = (
  embedding: number[]
): void => {

  const expectedDimensions =
    getEmbeddingDimensions();

  if (
    embedding.length !== expectedDimensions
  ) {

    throw new Error(
      `Invalid embedding dimensions. Expected ${expectedDimensions}, received ${embedding.length}`
    );

  }

  if (

    !embedding.every(
      (value) => Number.isFinite(value)
    )

  ) {

    throw new Error(
      "Embedding contains invalid numerical values"
    );

  }

};

// =====================================
// GENERATE SINGLE EMBEDDING
// =====================================

export const generateEmbedding = async (
  text: string
): Promise<number[]> => {

  const normalizedText = text.trim();

  if (!normalizedText) {

    throw new Error(
      "Cannot generate embedding for empty text"
    );

  }

  const extractor = await getExtractor();

  const output = await extractor(

    normalizedText,

    {
      pooling: "mean",

      normalize: true,
    }

  );

  const embedding = Array.from(

    output.data,

    (value) => Number(value)

  );

  validateEmbedding(embedding);

  return embedding;

};

// =====================================
// GENERATE BATCH EMBEDDINGS
// =====================================

export const generateEmbeddings = async (
  texts: string[]
): Promise<number[][]> => {

  if (texts.length === 0) {

    return [];

  }

  const embeddings: number[][] = [];

  const batchSize = 8;

  for (

    let index = 0;

    index < texts.length;

    index += batchSize

  ) {

    const batch = texts

      .slice(index, index + batchSize)

      .map((text) => text.trim());

    if (batch.some((text) => !text)) {

      throw new Error(
        "Embedding batch contains empty text"
      );

    }

    const extractor = await getExtractor();

    const output = await extractor(

      batch,

      {
        pooling: "mean",

        normalize: true,
      }

    );

    const batchEmbeddings =
      output.tolist() as number[][];

    for (const embedding of batchEmbeddings) {

      validateEmbedding(embedding);

      embeddings.push(embedding);

    }

  }

  return embeddings;

};
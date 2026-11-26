import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  indexResume,
  getIndexingStatus,
  removeResumeIndex,
  IndexingError,
} from "../services/indexing.service.js";

import {
  semanticSearch,
  VectorSearchError,
} from "../services/vectorSearch.service.js";

// Common error handler
const handleError = (
  error: unknown,
  res: Response
): void => {
  if (
    error instanceof IndexingError ||
    error instanceof VectorSearchError
  ) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  console.error(
    "Vector operation failed:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Generate and store resume embeddings
export const indexResumeController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const resumeId = req.params.resumeId;

    if (typeof resumeId !== "string") {
      throw new IndexingError(
        "Invalid resume ID",
        400
      );
    }

    const result = await indexResume(
      req.user.userId,
      resumeId
    );

    res.status(200).json({
      success: true,
      message: "Resume indexed successfully",
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Retrieve indexing status
export const getIndexingStatusController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const resumeId = req.params.resumeId;

    if (typeof resumeId !== "string") {
      throw new IndexingError(
        "Invalid resume ID",
        400
      );
    }

    const result = await getIndexingStatus(
      req.user.userId,
      resumeId
    );

    res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Remove stored resume embeddings
export const removeIndexController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const resumeId = req.params.resumeId;

    if (typeof resumeId !== "string") {
      throw new IndexingError(
        "Invalid resume ID",
        400
      );
    }

    const result = await removeResumeIndex(
      req.user.userId,
      resumeId
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Perform semantic similarity search
export const semanticSearchController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });

      return;
    }

    const resumeId = req.params.resumeId;

    if (typeof resumeId !== "string") {
      throw new VectorSearchError(
        "Invalid resume ID",
        400
      );
    }

    const { query, limit } = req.body ?? {};

    if (typeof query !== "string") {
      throw new VectorSearchError(
        "Search query must be a string",
        400
      );
    }

    if (
      limit !== undefined &&
      (
        typeof limit !== "number" ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 20
      )
    ) {
      throw new VectorSearchError(
        "Limit must be an integer between 1 and 20",
        400
      );
    }

    const result = await semanticSearch({
      userId: req.user.userId,
      resumeId,
      query,
      limit: limit ?? 5,
    });

    res.status(200).json({
      success: true,
      message: "Semantic search completed",
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};
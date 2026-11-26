import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  analyzeResume,
  getUserAnalyses,
  getAnalysisById,
  deleteAnalysis,
  AnalysisError,
} from "../services/analysis.service.js";

// Common error handler
const handleError = (
  error: unknown,
  res: Response
): void => {
  if (error instanceof AnalysisError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Generate AI analysis
export const analyzeResumeController = async (
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
      throw new AnalysisError("Invalid resume ID", 400);
    }

    const analysis = await analyzeResume(
      req.user.userId,
      resumeId
    );

    res.status(201).json({
      success: true,
      message: "AI resume analysis completed successfully",
      data: analysis,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Retrieve all analysis reports
export const getAnalysesController = async (
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

    const analyses = await getUserAnalyses(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      count: analyses.length,
      data: analyses,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Retrieve a specific analysis report
export const getAnalysisController = async (
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

    const analysisId = req.params.id;

    if (typeof analysisId !== "string") {
      throw new AnalysisError("Invalid analysis ID", 400);
    }

    const analysis = await getAnalysisById(
      req.user.userId,
      analysisId
    );

    res.status(200).json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Delete an analysis report
export const deleteAnalysisController = async (
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

    const analysisId = req.params.id;

    if (typeof analysisId !== "string") {
      throw new AnalysisError("Invalid analysis ID", 400);
    }

    const result = await deleteAnalysis(
      req.user.userId,
      analysisId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    handleError(error, res);
  }
};
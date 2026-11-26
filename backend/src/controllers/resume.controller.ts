import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  processResume,
  getUserResumes,
  getResumeById,
  deleteResume,
  ResumeError,
} from "../services/resume.service.js";

// Handle resume errors
const handleError = (
  error: unknown,
  res: Response
): void => {
  if (error instanceof ResumeError) {
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

// Upload resume
export const uploadResumeController = async (
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

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please upload a PDF resume",
      });

      return;
    }

    const result = await processResume(
      req.user.userId,
      req.file
    );

    res.status(201).json({
      success: true,
      message: "Resume uploaded and processed successfully",
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Get all user resumes
export const getResumesController = async (
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

    const resumes = await getUserResumes(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      count: resumes.length,
      data: resumes,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Get a single resume
export const getResumeController = async (
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

    const resumeId = req.params.id;

    if (typeof resumeId !== "string") {
      throw new ResumeError("Invalid resume ID", 400);
    }

    const resume = await getResumeById(
      req.user.userId,
      resumeId
    );

    res.status(200).json({
      success: true,
      data: resume,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Delete resume
export const deleteResumeController = async (
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

    const resumeId = req.params.id;

    if (typeof resumeId !== "string") {
      throw new ResumeError("Invalid resume ID", 400);
    }

    const result = await deleteResume(
      req.user.userId,
      resumeId
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    handleError(error, res);
  }
};
import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  matchResumeToJob,
  getJobMatches,
  getJobMatchById,
  deleteJobMatch,
  JobMatchingError,
} from "../services/jobMatching.service.js";

// Common error handler
const handleError = (
  error: unknown,
  res: Response
): void => {
  if (error instanceof JobMatchingError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  console.error(
    "Job matching operation failed:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Retrieve authenticated user ID
const getUserId = (
  req: AuthenticatedRequest
): string => {
  if (!req.user) {
    throw new JobMatchingError(
      "Authentication required",
      401
    );
  }

  return req.user.userId;
};

// Retrieve job matching report ID
const getJobMatchId = (
  req: AuthenticatedRequest
): string => {
  const jobMatchId =
    req.params.jobMatchId;

  if (typeof jobMatchId !== "string") {
    throw new JobMatchingError(
      "Invalid job matching report ID",
      400
    );
  }

  return jobMatchId;
};

// Validate pagination parameters
const parsePagination = (
  value: unknown,
  defaultValue: number
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw new JobMatchingError(
      "Invalid pagination parameter",
      400
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new JobMatchingError(
      "Invalid pagination parameter",
      400
    );
  }

  return parsed;
};

// 1. Generate a job matching report
export const matchResumeToJobController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const result = await matchResumeToJob(
      userId,
      req.body
    );

    res.status(201).json({
      success: true,

      message:
        "Job matching report generated successfully",

      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 2. Retrieve all job matching reports
export const getJobMatchesController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const page = parsePagination(
      req.query.page,
      1
    );

    const limit = parsePagination(
      req.query.limit,
      20
    );

    const result = await getJobMatches(
      userId,
      page,
      limit
    );

    res.status(200).json({
      success: true,

      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 3. Retrieve individual job matching report
export const getJobMatchController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const jobMatchId =
      getJobMatchId(req);

    const result = await getJobMatchById(
      userId,
      jobMatchId
    );

    res.status(200).json({
      success: true,

      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 4. Delete a job matching report
export const deleteJobMatchController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const jobMatchId =
      getJobMatchId(req);

    const result = await deleteJobMatch(
      userId,
      jobMatchId
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
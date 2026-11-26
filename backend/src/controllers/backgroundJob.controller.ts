import type {
  Request,
  Response,
} from "express";

import {
  BackgroundJobError,
  queueInterviewReport,
  getBackgroundJobStatus,
} from "../services/backgroundJob.service.js";

// =====================================
// AUTHENTICATED REQUEST
// =====================================

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

// =====================================
// GET AUTHENTICATED USER
// =====================================

const getAuthenticatedUserId = (
  req: Request
): string => {
  const authenticatedRequest =
    req as AuthenticatedRequest;

  const userId =
    authenticatedRequest.user?.userId;

  if (!userId) {
    throw new BackgroundJobError(
      "Authentication required",
      401
    );
  }

  return userId;
};

// =====================================
// VALIDATE ROUTE PARAMETER
// =====================================

const getRouteParameter = (
  value: unknown,
  field: string
): string => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new BackgroundJobError(
      `${field} is required`,
      400
    );
  }

  return value;
};

// =====================================
// HANDLE CONTROLLER ERRORS
// =====================================

const handleBackgroundJobError = (
  error: unknown,
  res: Response
): void => {
  if (error instanceof BackgroundJobError) {
    res.status(error.statusCode).json({
      success: false,

      message: error.message,
    });

    return;
  }

  // Handle known service-level errors.

  if (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    const allowedStatuses = [
      400,
      401,
      403,
      404,
      409,
      422,
      429,
    ];

    if (
      allowedStatuses.includes(
        error.statusCode
      )
    ) {
      res.status(error.statusCode).json({
        success: false,

        message: error.message,
      });

      return;
    }
  }

  // Avoid exposing infrastructure
  // errors or sensitive information.

  console.error(
    "Background job controller error:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  res.status(500).json({
    success: false,

    message:
      "Unable to process background job request",
  });
};

// =====================================
// QUEUE INTERVIEW REPORT
// =====================================

export const queueInterviewReportController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const sessionId =
        getRouteParameter(
          req.params.sessionId,
          "Session ID"
        );

      const job =
        await queueInterviewReport(
          userId,
          sessionId
        );

      const isTerminal =
        job.status === "completed" ||
        job.status === "failed";

      res
        .status(isTerminal ? 200 : 202)
        .json({
          success: true,

          message:
            job.status === "completed"
              ? "Background job already completed"
              : job.status === "failed"
                ? "Previous background job failed"
                : "Interview report job accepted",

          data: job,
        });

    } catch (error) {
      handleBackgroundJobError(
        error,
        res
      );
    }
  };

// =====================================
// GET BACKGROUND JOB STATUS
// =====================================

export const getBackgroundJobStatusController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const jobId =
        getRouteParameter(
          req.params.jobId,
          "Job ID"
        );

      const job =
        await getBackgroundJobStatus(
          userId,
          jobId
        );

      res.status(200).json({
        success: true,

        data: job,
      });

    } catch (error) {
      handleBackgroundJobError(
        error,
        res
      );
    }
  };
import type {
  Request,
  Response,
} from "express";

import {
  BackgroundJobError,
} from "../services/backgroundJob.service.js";

import {
  retryBackgroundJob,
} from "../services/backgroundJobRetry.service.js";

// =====================================
// AUTHENTICATED REQUEST
// =====================================

interface AuthenticatedRequest
  extends Request {
  user?: {
    userId: string;
  };
}

// =====================================
// RETRY BACKGROUND JOB CONTROLLER
// =====================================

export const retryBackgroundJobController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Retrieve authenticated user.

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

      // Validate job ID.

      const jobId = req.params.jobId;

      if (
        typeof jobId !== "string" ||
        !jobId.trim()
      ) {
        throw new BackgroundJobError(
          "Job ID is required",
          400
        );
      }

      // Retry existing background job.

      const job = await retryBackgroundJob(
        userId,
        jobId
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
              ? "Background job completed"
              : job.status === "failed"
                ? "Background job failed again"
                : "Background job retry accepted",

          data: job,
        });

    } catch (error) {
      // Known background job errors.

      if (
        error instanceof BackgroundJobError
      ) {
        res.status(error.statusCode).json({
          success: false,

          message: error.message,
        });

        return;
      }

      // Known service errors.

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
          503,
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

      // Unexpected errors.

      console.error(
        "Background job retry error:",
        error instanceof Error
          ? error.name
          : "Unknown error"
      );

      res.status(500).json({
        success: false,

        message:
          "Unable to retry background job",
      });
    }
  };
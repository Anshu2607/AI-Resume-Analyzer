import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import {
  IDEMPOTENCY_CONFIG,
} from "../config/idempotency.config.js";

import type {
  IdempotencyOperation,
} from "../config/idempotency.config.js";

import {
  IdempotencyError,
  createRequestFingerprint,
  acquireIdempotency,
  completeIdempotency,
  releaseIdempotency,
} from "../services/idempotency.service.js";

// =====================================
// AUTHENTICATED REQUEST
// =====================================

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

// =====================================
// IDEMPOTENCY MIDDLEWARE OPTIONS
// =====================================

interface IdempotencyMiddlewareOptions {
  operation: IdempotencyOperation;

  required?: boolean;
}

// =====================================
// CREATE IDEMPOTENCY MIDDLEWARE
// =====================================

export const createIdempotencyMiddleware = (
  options: IdempotencyMiddlewareOptions
): RequestHandler => {

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {

    try {
      // Retrieve authenticated user.

      const authenticatedRequest =
        req as AuthenticatedRequest;

      const userId =
        authenticatedRequest.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,

          message: "Authentication required",
        });

        return;
      }

      // Retrieve idempotency key.

      const idempotencyKey = req.get(
        IDEMPOTENCY_CONFIG.headerName
      );

      if (!idempotencyKey) {
        if (options.required) {
          res.status(400).json({
            success: false,

            message:
              "Idempotency-Key header is required",
          });

          return;
        }

        next();

        return;
      }

      // Generate request fingerprint.

      const fingerprint =
        createRequestFingerprint(
          req.method,
          req.originalUrl,
          req.body
        );

      // Acquire Redis idempotency lock.

      const result =
        await acquireIdempotency(
          userId,
          options.operation,
          idempotencyKey,
          fingerprint
        );

      // =================================
      // EXISTING PROCESSING REQUEST
      // =================================

      if (result.status === "processing") {
        res.status(409).json({
          success: false,

          message:
            "An identical request is already being processed",
        });

        return;
      }

      // =================================
      // REPLAY COMPLETED RESPONSE
      // =================================

      if (result.status === "completed") {
        res.setHeader(
          "Idempotency-Replayed",
          "true"
        );

        res.status(
          result.statusCode
        ).json(result.response);

        return;
      }

      // =================================
      // NEW REQUEST ACQUIRED
      // =================================

      const {
        redisKey,
        token,
      } = result;

      const originalJson =
        res.json.bind(res);

      let responseHandled = false;

      res.setHeader(
        "Idempotency-Replayed",
        "false"
      );

      // =================================
      // INTERCEPT JSON RESPONSE
      // =================================

      res.json = (body: unknown): Response => {

        if (responseHandled) {
          return res;
        }

        responseHandled = true;

        const statusCode =
          res.statusCode;

        const finalizeResponse =
          async (): Promise<void> => {

            try {
              // Cache successful responses.

              if (
                statusCode >= 200 &&
                statusCode < 300
              ) {

                const saved =
                  await completeIdempotency(
                    redisKey,
                    token,
                    fingerprint,
                    statusCode,
                    body
                  );

                if (!saved) {
                  console.warn(
                    "Idempotency response was not saved"
                  );
                }

              } else if (
                statusCode >= 400 &&
                statusCode < 500
              ) {

                // Release locks after rejected requests.

                await releaseIdempotency(
                  redisKey,
                  token
                );

              }

              // For unexpected server failures,
              // preserve the processing lock until
              // expiration because the operation
              // may already have produced side effects.

            } catch (error) {

              console.error(
                "Idempotency finalization failed:",
                error instanceof Error
                  ? error.name
                  : "Unknown error"
              );

            } finally {

              if (
                !res.headersSent &&
                !res.destroyed &&
                !res.writableEnded
              ) {
                originalJson(body);
              }

            }
          };

        void finalizeResponse();

        return res;
      };

      // Continue to the actual controller.

      next();

    } catch (error) {

      if (
        error instanceof IdempotencyError
      ) {

        res.status(error.statusCode).json({
          success: false,

          message: error.message,
        });

        return;
      }

      console.error(
        "Idempotency middleware error:",
        error instanceof Error
          ? error.name
          : "Unknown error"
      );

      res.status(503).json({
        success: false,

        message:
          "Request protection is temporarily unavailable",
      });

    }
  };
};
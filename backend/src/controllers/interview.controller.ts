import type {
  Request,
  Response,
} from "express";

import {
  createInterviewSchema,
} from "../validators/interview.validator.js";

import {
  createInterviewSession,
  submitInterviewAnswer,
  skipInterviewQuestion,
  getInterviewSessionById,
  getInterviewSessions,
  cancelInterviewSession,
  deleteInterviewSession,
  InterviewSessionError,
} from "../services/interviewSession.service.js";

import {
  InterviewReportError,
} from "../services/interviewReport.service.js";

import {
  getCachedInterviewReport,
  generateCachedInterviewReport,
  invalidateInterviewReportCache,
} from "../services/cachedInterviewReport.service.js";

import {
  InterviewAIError,
} from "../services/interviewAI.service.js";

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

const getUserId = (req: Request): string => {
  const authenticatedRequest =
    req as AuthenticatedRequest;

  const userId =
    authenticatedRequest.user?.userId;

  if (!userId) {
    throw new InterviewSessionError(
      "Authentication required",
      401
    );
  }

  return userId;
};

// =====================================
// GET SESSION ID
// =====================================

const getSessionId = (
  req: Request
): string => {
  const sessionId = req.params.sessionId;

  if (
    typeof sessionId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(sessionId)
  ) {
    throw new InterviewSessionError(
      "Invalid interview session ID",
      400
    );
  }

  return sessionId;
};

// =====================================
// CENTRALIZED ERROR HANDLING
// =====================================

const handleInterviewError = (
  error: unknown,
  res: Response
): void => {
  if (
    error instanceof InterviewSessionError ||
    error instanceof InterviewAIError ||
    error instanceof InterviewReportError
  ) {
    res.status(error.statusCode).json({
      success: false,

      message: error.message,
    });

    return;
  }

  // Handle errors from existing resource services.

  if (error instanceof Error) {
    const serviceError = error as Error & {
      statusCode?: number;
    };

    const statusCode =
      serviceError.statusCode;

    if (
      typeof statusCode === "number" &&
      [400, 401, 403, 404, 409, 422, 429].includes(
        statusCode
      )
    ) {
      res.status(statusCode).json({
        success: false,

        message: serviceError.message,
      });

      return;
    }
  }

  console.error(
    "Interview operation failed:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  res.status(500).json({
    success: false,

    message:
      "An unexpected interview operation error occurred",
  });
};

// =====================================
// CREATE INTERVIEW
// =====================================

export const createInterviewController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const validation =
      createInterviewSchema.safeParse(
        req.body
      );

    if (!validation.success) {
      res.status(400).json({
        success: false,

        message:
          "Invalid interview configuration",

        errors:
          validation.error.issues.map(
            (issue) => ({
              field:
                issue.path.join("."),

              message:
                issue.message,
            })
          ),
      });

      return;
    }

    const session =
      await createInterviewSession(
        userId,
        validation.data
      );

    res.status(201).json({
      success: true,

      message:
        "Interview session created successfully",

      data: session,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// SUBMIT INTERVIEW ANSWER
// =====================================

export const submitAnswerController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    const result =
      await submitInterviewAnswer(
        userId,
        sessionId,
        req.body
      );

    res.status(200).json({
      success: true,

      message:
        result.session.status === "completed"
          ? "Interview completed successfully"
          : "Answer evaluated successfully",

      data: result,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// SKIP INTERVIEW QUESTION
// =====================================

export const skipQuestionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    const result =
      await skipInterviewQuestion(
        userId,
        sessionId,
        req.body
      );

    res.status(200).json({
      success: true,

      message:
        result.session.status === "completed"
          ? "Interview completed"
          : "Question skipped successfully",

      data: result,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// GET INTERVIEW HISTORY
// =====================================

export const getInterviewsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const rawPage =
      req.query.page;

    const rawLimit =
      req.query.limit;

    if (
      (rawPage !== undefined &&
        (
          typeof rawPage !== "string" ||
          !/^\d+$/.test(rawPage)
        )) ||

      (rawLimit !== undefined &&
        (
          typeof rawLimit !== "string" ||
          !/^\d+$/.test(rawLimit)
        ))
    ) {
      res.status(400).json({
        success: false,

        message:
          "Invalid pagination parameters",
      });

      return;
    }

    const page =
      rawPage === undefined
        ? 1
        : Number(rawPage);

    const limit =
      rawLimit === undefined
        ? 20
        : Number(rawLimit);

    const result =
      await getInterviewSessions(
        userId,
        page,
        limit
      );

    res.status(200).json({
      success: true,

      data: result,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// GET INTERVIEW SESSION
// =====================================

export const getInterviewByIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    const session =
      await getInterviewSessionById(
        userId,
        sessionId
      );

    res.status(200).json({
      success: true,

      data: session,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// GENERATE PERFORMANCE REPORT
// =====================================

export const generateReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    // Generate report and invalidate
    // any previously cached report.

    const report =
      await generateCachedInterviewReport(
        userId,
        sessionId
      );

    res.status(200).json({
      success: true,

      message:
        "Interview performance report is ready",

      data: report,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// GET PERFORMANCE REPORT
// =====================================

export const getReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    // Verify ownership and retrieve
    // the report using Redis cache-aside.

    const report =
      await getCachedInterviewReport(
        userId,
        sessionId
      );

    res.status(200).json({
      success: true,

      data: report,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// CANCEL INTERVIEW
// =====================================

export const cancelInterviewController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    const session =
      await cancelInterviewSession(
        userId,
        sessionId
      );

    res.status(200).json({
      success: true,

      message:
        "Interview cancelled successfully",

      data: session,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};

// =====================================
// DELETE INTERVIEW
// =====================================

export const deleteInterviewController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const sessionId =
      getSessionId(req);

    // Delete the original MongoDB resource.

    const result =
      await deleteInterviewSession(
        userId,
        sessionId
      );

    // Remove any associated cached report.

    await invalidateInterviewReportCache(
      userId,
      sessionId
    );

    res.status(200).json({
      success: true,

      message:
        "Interview deleted successfully",

      data: result,
    });

  } catch (error) {
    handleInterviewError(error, res);
  }
};
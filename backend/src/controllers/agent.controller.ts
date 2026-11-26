import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  AgentSessionError,
  createAgentSession,
  approveAgentSession,
  getAgentSessions,
  getAgentSessionById,
  cancelAgentSession,
  deleteAgentSession,
} from "../services/agentSession.service.js";

// =====================================
// ERROR HANDLING
// =====================================

const handleError = (
  error: unknown,
  res: Response
): void => {

  if (error instanceof AgentSessionError) {

    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  console.error(
    "Agent controller error:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// =====================================
// GET AUTHENTICATED USER
// =====================================

const getUserId = (
  req: AuthenticatedRequest
): string => {

  const userId = req.user?.userId;

  if (!userId) {
    throw new AgentSessionError(
      "Unauthorized",
      401
    );
  }

  return userId;
};

// =====================================
// GET SESSION ID
// =====================================

const getSessionId = (
  req: AuthenticatedRequest
): string => {

  const sessionId = req.params.sessionId;

  if (
    typeof sessionId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(sessionId)
  ) {
    throw new AgentSessionError(
      "Invalid agent session ID",
      400
    );
  }

  return sessionId;
};

// =====================================
// PAGINATION HELPER
// =====================================

const parsePagination = (
  req: AuthenticatedRequest
) => {

  const parseValue = (
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
      throw new AgentSessionError(
        "Invalid pagination parameters",
        400
      );
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
      throw new AgentSessionError(
        "Invalid pagination parameters",
        400
      );
    }

    return parsed;
  };

  return {
    page: parseValue(
      req.query.page,
      1
    ),

    limit: parseValue(
      req.query.limit,
      20
    ),
  };
};

// =====================================
// 1. CREATE AGENT SESSION
// =====================================

export const createAgentController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const session =
        await createAgentSession(
          userId,
          req.body
        );

      res.status(201).json({
        success: true,

        message:
          "Agent session created successfully",

        data: session,
      });

    } catch (error) {

      handleError(error, res);

    }
  };

// =====================================
// 2. APPROVE OR DECLINE TOOL EXECUTION
// =====================================

export const approveAgentController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const sessionId =
        getSessionId(req);

      const session =
        await approveAgentSession(
          userId,
          sessionId,
          req.body
        );

      res.status(200).json({
        success: true,

        message:
          "Agent approval processed successfully",

        data: session,
      });

    } catch (error) {

      handleError(error, res);

    }
  };

// =====================================
// 3. GET ALL AGENT SESSIONS
// =====================================

export const getAgentSessionsController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const { page, limit } =
        parsePagination(req);

      const result =
        await getAgentSessions(
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

// =====================================
// 4. GET INDIVIDUAL AGENT SESSION
// =====================================

export const getAgentSessionController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const sessionId =
        getSessionId(req);

      const session =
        await getAgentSessionById(
          userId,
          sessionId
        );

      res.status(200).json({
        success: true,

        data: session,
      });

    } catch (error) {

      handleError(error, res);

    }
  };

// =====================================
// 5. CANCEL PAUSED AGENT SESSION
// =====================================

export const cancelAgentController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const sessionId =
        getSessionId(req);

      const session =
        await cancelAgentSession(
          userId,
          sessionId
        );

      res.status(200).json({
        success: true,

        message:
          "Agent session cancelled successfully",

        data: session,
      });

    } catch (error) {

      handleError(error, res);

    }
  };

// =====================================
// 6. DELETE AGENT SESSION
// =====================================

export const deleteAgentController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {

    try {

      const userId = getUserId(req);

      const sessionId =
        getSessionId(req);

      const result =
        await deleteAgentSession(
          userId,
          sessionId
        );

      res.status(200).json({
        success: true,

        message: result.message,

        data: {
          sessionId: result.sessionId,
        },
      });

    } catch (error) {

      handleError(error, res);

    }
  };
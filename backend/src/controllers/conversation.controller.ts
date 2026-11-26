import type { Response } from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createConversation,
  getConversations,
  getConversationById,
  sendConversationMessage,
  renameConversation,
  updateConversationStatus,
  deleteConversation,
  ConversationError,
} from "../services/conversation.service.js";

// Common error handler
const handleError = (
  error: unknown,
  res: Response
): void => {
  if (error instanceof ConversationError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  console.error(
    "Conversation operation failed:",
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
    throw new ConversationError(
      "Authentication required",
      401
    );
  }

  return req.user.userId;
};

// Retrieve conversation ID
const getConversationId = (
  req: AuthenticatedRequest
): string => {
  const conversationId =
    req.params.conversationId;

  if (typeof conversationId !== "string") {
    throw new ConversationError(
      "Invalid conversation ID",
      400
    );
  }

  return conversationId;
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
    throw new ConversationError(
      "Invalid pagination parameter",
      400
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new ConversationError(
      "Invalid pagination parameter",
      400
    );
  }

  return parsed;
};

// 1. Create conversation
export const createConversationController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const { resumeId } = req.body ?? {};

    if (typeof resumeId !== "string") {
      throw new ConversationError(
        "Resume ID is required",
        400
      );
    }

    const conversation =
      await createConversation(
        userId,
        resumeId
      );

    res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      data: conversation,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 2. Retrieve conversations
export const getConversationsController = async (
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

    const result = await getConversations(
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

// 3. Retrieve conversation history
export const getConversationController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const conversationId =
      getConversationId(req);

    const page = parsePagination(
      req.query.page,
      1
    );

    const limit = parsePagination(
      req.query.limit,
      50
    );

    const result =
      await getConversationById(
        userId,
        conversationId,
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

// 4. Send message and generate RAG response
export const sendMessageController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const conversationId =
      getConversationId(req);

    const {
      question,
      limit,
      consent,
    } = req.body ?? {};

    // Require acknowledgement of external AI processing
    if (consent !== true) {
      throw new ConversationError(
        "Consent to external AI processing is required",
        400
      );
    }

    if (typeof question !== "string") {
      throw new ConversationError(
        "Question must be a string",
        400
      );
    }

    if (
      limit !== undefined &&
      (
        typeof limit !== "number" ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 10
      )
    ) {
      throw new ConversationError(
        "Limit must be an integer between 1 and 10",
        400
      );
    }

    const result =
      await sendConversationMessage(
        userId,
        conversationId,
        question,
        limit ?? 5
      );

    res.status(201).json({
      success: true,
      message: "Message processed successfully",
      data: result,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 5. Rename conversation
export const renameConversationController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const conversationId =
      getConversationId(req);

    const { title } = req.body ?? {};

    if (typeof title !== "string") {
      throw new ConversationError(
        "Title must be a string",
        400
      );
    }

    const conversation =
      await renameConversation(
        userId,
        conversationId,
        title
      );

    res.status(200).json({
      success: true,
      message: "Conversation renamed successfully",
      data: conversation,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 6. Archive or restore conversation
export const updateStatusController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const conversationId =
      getConversationId(req);

    const { status } = req.body ?? {};

    if (
      status !== "active" &&
      status !== "archived"
    ) {
      throw new ConversationError(
        "Status must be active or archived",
        400
      );
    }

    const conversation =
      await updateConversationStatus(
        userId,
        conversationId,
        status
      );

    res.status(200).json({
      success: true,
      message: "Conversation status updated",
      data: conversation,
    });

  } catch (error) {
    handleError(error, res);
  }
};

// 7. Delete conversation
export const deleteConversationController = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    const conversationId =
      getConversationId(req);

    const result =
      await deleteConversation(
        userId,
        conversationId
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
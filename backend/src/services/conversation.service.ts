import mongoose from "mongoose";

import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Resume from "../models/resume.model.js";

import {
  askResumeQuestion,
  RAGError,
} from "./rag.service.js";

import {
  ragQuerySchema,
} from "../validators/rag.validator.js";

export class ConversationError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ConversationError";
  }
}

const validateId = (
  id: string,
  label: string
): void => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ConversationError(
      `Invalid ${label}`,
      400
    );
  }
};

// Verify conversation ownership
const findOwnedConversation = async (
  userId: string,
  conversationId: string
) => {
  validateId(userId, "user ID");
  validateId(conversationId, "conversation ID");

  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  });

  if (!conversation) {
    throw new ConversationError(
      "Conversation not found",
      404
    );
  }

  return conversation;
};

// Generate title from the first question
const generateTitle = (
  question: string
): string => {
  const normalized = question
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 60) {
    return normalized;
  }

  return normalized.slice(0, 57) + "...";
};

// 1. Create a conversation
export const createConversation = async (
  userId: string,
  resumeId: string
) => {
  validateId(userId, "user ID");
  validateId(resumeId, "resume ID");

  const resume = await Resume.exists({
    _id: resumeId,
    userId,
    status: "processed",
  });

  if (!resume) {
    throw new ConversationError(
      "Resume not found or not processed",
      404
    );
  }

  return Conversation.create({
    userId,
    resumeId,
    title: "New Career Conversation",
    status: "active",
    messageCount: 0,
    lastMessageAt: new Date(),
  });
};

// 2. Retrieve all user conversations
export const getConversations = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  validateId(userId, "user ID");

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new ConversationError(
      "Invalid pagination parameters",
      400
    );
  }

  const filter = { userId };

  const [conversations, total] =
    await Promise.all([
      Conversation.find(filter)
        .sort({
          lastMessageAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Conversation.countDocuments(filter),
    ]);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// 3. Retrieve a conversation and its messages
export const getConversationById = async (
  userId: string,
  conversationId: string,
  page = 1,
  limit = 50
) => {
  const conversation =
    await findOwnedConversation(
      userId,
      conversationId
    );

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ConversationError(
      "Invalid pagination parameters",
      400
    );
  }

  const filter = {
    userId,
    conversationId,
  };

  const [messages, total] =
    await Promise.all([
      Message.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Message.countDocuments(filter),
    ]);

  return {
    conversation,

    // Return each page in chronological order
    messages: messages.reverse(),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// 4. Ask a question inside a conversation
export const sendConversationMessage = async (
  userId: string,
  conversationId: string,
  question: string,
  limit = 5
) => {
  const validation = ragQuerySchema.safeParse({
    question,
    limit,
  });

  if (!validation.success) {
    throw new ConversationError(
      validation.error.issues[0]?.message ||
        "Invalid question",
      400
    );
  }

  const conversation =
    await findOwnedConversation(
      userId,
      conversationId
    );

  if (conversation.status !== "active") {
    throw new ConversationError(
      "Conversation is archived",
      409
    );
  }

  const validatedQuestion =
    validation.data.question;

  // Generate RAG response outside the transaction
  const result = await askResumeQuestion({
    userId,
    resumeId: conversation.resumeId.toString(),
    question: validatedQuestion,
    limit: validation.data.limit,
  }).catch((error: unknown) => {
    if (error instanceof RAGError) {
      throw new ConversationError(
        error.message,
        error.statusCode
      );
    }

    throw error;
  });

  const session = await mongoose.startSession();

  try {
    const response = await session.withTransaction(
      async () => {
        // Recheck conversation before saving messages
        const currentConversation =
          await Conversation.findOne({
            _id: conversationId,
            userId,
            status: "active",
          }).session(session);

        if (!currentConversation) {
          throw new ConversationError(
            "Conversation is no longer available",
            409
          );
        }

        const userMessage = new Message({
          userId,
          conversationId,
          role: "user",
          content: validatedQuestion,
        });

        await userMessage.save({ session });

        const assistantMessage = new Message({
          userId,
          conversationId,
          role: "assistant",
          content: result.answer,

          supportingEvidence:
            result.supportingEvidence,

          sources: result.sources,

          followUpQuestions:
            result.followUpQuestions,

          metadata: {
            provider: result.provider,
            modelUsed: result.modelUsed,
            promptVersion: result.promptVersion,
            confidence: result.confidence,
            insufficientContext:
              result.insufficientContext,
            retrievalTime: result.retrievalTime,
            processingTime: result.processingTime,
          },
        });

        await assistantMessage.save({ session });

        // Generate title for the first message
        if (
          currentConversation.messageCount === 0 &&
          currentConversation.title ===
            "New Career Conversation"
        ) {
          currentConversation.title =
            generateTitle(validatedQuestion);
        }

        currentConversation.messageCount += 2;

        currentConversation.lastMessageAt =
          assistantMessage.createdAt;

        await currentConversation.save({
          session,
        });

        return {
          conversation: currentConversation,
          userMessage,
          assistantMessage,
        };
      }
    );

    if (!response) {
      throw new ConversationError(
        "Unable to save conversation messages",
        500
      );
    }

    return response;
  } finally {
    await session.endSession();
  }
};

// 5. Rename a conversation
export const renameConversation = async (
  userId: string,
  conversationId: string,
  title: string
) => {
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150
  ) {
    throw new ConversationError(
      "Title must contain between 1 and 150 characters",
      400
    );
  }

  validateId(userId, "user ID");
  validateId(conversationId, "conversation ID");

  const conversation =
    await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        userId,
      },
      {
        $set: {
          title: title.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!conversation) {
    throw new ConversationError(
      "Conversation not found",
      404
    );
  }

  return conversation;
};

// 6. Archive or restore a conversation
export const updateConversationStatus = async (
  userId: string,
  conversationId: string,
  status: "active" | "archived"
) => {
  if (
    status !== "active" &&
    status !== "archived"
  ) {
    throw new ConversationError(
      "Invalid conversation status",
      400
    );
  }

  validateId(userId, "user ID");
  validateId(conversationId, "conversation ID");

  const conversation =
    await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        userId,
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!conversation) {
    throw new ConversationError(
      "Conversation not found",
      404
    );
  }

  return conversation;
};

// 7. Delete conversation and its messages
export const deleteConversation = async (
  userId: string,
  conversationId: string
) => {
  validateId(userId, "user ID");
  validateId(conversationId, "conversation ID");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const conversation =
        await Conversation.findOneAndDelete(
          {
            _id: conversationId,
            userId,
          },
          { session }
        );

      if (!conversation) {
        throw new ConversationError(
          "Conversation not found",
          404
        );
      }

      await Message.deleteMany(
        {
          userId,
          conversationId,
        },
        { session }
      );
    });

    return {
      conversationId,
      message: "Conversation deleted successfully",
    };
  } finally {
    await session.endSession();
  }
};
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

import {
  trackPresence,
  trackActivity,
} from "../middleware/activity.middleware.js";

import {
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  createConversationController,
  getConversationsController,
  getConversationController,
  sendMessageController,
  renameConversationController,
  updateStatusController,
  deleteConversationController,
} from "../controllers/conversation.controller.js";

const router = Router();

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// CONVERSATION CREATION RATE LIMITER
// =====================================

const conversationLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Conversation creation limit reached. Please try again later.",

  },

});

// =====================================
// AI MESSAGE RATE LIMITER
// =====================================

const messageLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "AI message limit reached. Please try again later.",

  },

});

// =====================================
// CREATE CONVERSATION
// =====================================

router.post(

  "/",

  conversationLimiter,

  createConversationController

);

// =====================================
// RETRIEVE ALL CONVERSATIONS
// =====================================

router.get(

  "/",

  getConversationsController

);

// =====================================
// RETRIEVE CONVERSATION HISTORY
// =====================================

router.get(

  "/:conversationId",

  getConversationController

);

// =====================================
// ASK QUESTION AND GENERATE RAG ANSWER
// =====================================

router.post(

  "/:conversationId/messages",

  trackActivity(
    ACTIVITY_TYPES.RAG_CONVERSATION
  ),

  messageLimiter,

  sendMessageController

);

// =====================================
// RENAME CONVERSATION
// =====================================

router.patch(

  "/:conversationId/title",

  renameConversationController

);

// =====================================
// ARCHIVE OR RESTORE CONVERSATION
// =====================================

router.patch(

  "/:conversationId/status",

  updateStatusController

);

// =====================================
// DELETE CONVERSATION
// =====================================

router.delete(

  "/:conversationId",

  deleteConversationController

);

export default router;
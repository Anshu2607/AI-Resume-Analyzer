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
  createAgentController,
  approveAgentController,
  getAgentSessionsController,
  getAgentSessionController,
  cancelAgentController,
  deleteAgentController,
} from "../controllers/agent.controller.js";

const router = Router();

// =====================================
// AGENT EXECUTION RATE LIMITER
// =====================================

const agentExecutionLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 5,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Too many agent execution requests. Please try again later.",

  },

});

// =====================================
// AGENT APPROVAL RATE LIMITER
// =====================================

const agentApprovalLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: true,

  legacyHeaders: false,

  message: {

    success: false,

    message:
      "Too many agent approval requests. Please try again later.",

  },

});

// =====================================
// AUTHENTICATION AND PRESENCE TRACKING
// =====================================

router.use(authenticate);

router.use(trackPresence);

// =====================================
// START AGENT EXECUTION
// =====================================

router.post(

  "/",

  trackActivity(
    ACTIVITY_TYPES.AGENT_EXECUTION
  ),

  agentExecutionLimiter,

  createAgentController

);

// =====================================
// RETRIEVE AGENT SESSION HISTORY
// =====================================

router.get(

  "/",

  getAgentSessionsController

);

// =====================================
// RETRIEVE INDIVIDUAL AGENT SESSION
// =====================================

router.get(

  "/:sessionId",

  getAgentSessionController

);

// =====================================
// APPROVE OR DECLINE TOOL EXECUTION
// =====================================

router.post(

  "/:sessionId/approval",

  agentApprovalLimiter,

  approveAgentController

);

// =====================================
// CANCEL PAUSED AGENT SESSION
// =====================================

router.patch(

  "/:sessionId/cancel",

  cancelAgentController

);

// =====================================
// DELETE AGENT SESSION
// =====================================

router.delete(

  "/:sessionId",

  deleteAgentController

);

export default router;
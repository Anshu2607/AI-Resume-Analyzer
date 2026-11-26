import mongoose from "mongoose";

import { randomUUID } from "node:crypto";

import AgentSession from "../models/agentSession.model.js";

import {
  AGENT_VERSION,
} from "../config/agent.config.js";

import {
  agentRequestSchema,
  agentApprovalSchema,
} from "../validators/agent.validator.js";

import {
  createAgentState,
  failAgentState,
} from "../agents/agentState.js";

import type {
  AgentState,
} from "../agents/agentState.js";

import {
  startAgentExecution,
  resumeAgentExecution,
  AgentEngineError,
} from "../agents/agentEngine.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

// =====================================
// CUSTOM SESSION ERROR
// =====================================

export class AgentSessionError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);

    this.name = "AgentSessionError";
  }
}

// =====================================
// VALIDATE MONGODB ID
// =====================================

const validateId = (
  id: string,
  label: string
): void => {
  if (
    !/^[a-fA-F0-9]{24}$/.test(id) ||
    !mongoose.isValidObjectId(id)
  ) {
    throw new AgentSessionError(
      `Invalid ${label}`,
      400
    );
  }
};

// =====================================
// ERROR HANDLING
// =====================================

const getSafeError = (
  error: unknown
): string => {
  if (
    error instanceof AgentEngineError ||
    error instanceof AgentSessionError
  ) {
    return redactPersonalInformation(
      error.message
    ).slice(0, 1000);
  }

  console.error(
    "Agent session operation failed:",
    error instanceof Error
      ? error.name
      : "Unknown error"
  );

  return "Agent execution could not be completed.";
};

// =====================================
// GENERATE SESSION TITLE
// =====================================

const generateSessionTitle = (
  goal: string
): string => {
  const sanitized =
    redactPersonalInformation(goal)
      .replace(/\s+/g, " ")
      .trim();

  if (!sanitized) {
    return "Career AI Agent Session";
  }

  return sanitized.length > 100
    ? `${sanitized.slice(0, 97)}...`
    : sanitized;
};

// =====================================
// BUILD PERSISTENCE SNAPSHOT
// =====================================

const buildSessionUpdate = (
  state: AgentState
) => {
  return {
    state,

    status: state.status,

    iteration: state.iteration,

    totalToolCalls:
      state.totalToolCalls,

    generativeToolCalls:
      state.generativeToolCalls,

    artifactCount:
      state.artifacts.length,

    startedAt:
      new Date(state.startedAt),

    completedAt:
      state.completedAt
        ? new Date(state.completedAt)
        : null,
  };
};

// =====================================
// BUILD PUBLIC SESSION RESPONSE
// =====================================

const buildPublicSession = (
  sessionId: string,
  state: AgentState,
  title: string,
  createdAt: Date,
  updatedAt: Date
) => {
  return {
    _id: sessionId,

    title,

    goal:
      redactPersonalInformation(
        state.context.request.goal
      ),

    status: state.status,

    iteration: state.iteration,

    totalToolCalls:
      state.totalToolCalls,

    generativeToolCalls:
      state.generativeToolCalls,

    executionSteps:
      state.executionSteps,

    artifacts:
      state.artifacts,

    pendingApproval:
      state.pendingApproval,

    clarification:
      state.clarification,

    finalResponse:
      state.finalResponse,

    errorMessage:
      state.errorMessage,

    learningPreferences:
      state.context.request.learningPreferences,

    resourceReferences: {
      resumeId:
        state.context.request.resumeId ?? null,

      analysisId:
        state.context.request.analysisId ?? null,

      jobMatchId:
        state.context.request.jobMatchId ?? null,

      roadmapId:
        state.context.request.roadmapId ?? null,

      jobTitle:
        state.context.request.jobTitle
          ? redactPersonalInformation(
              state.context.request.jobTitle
            )
          : null,

      companyName:
        state.context.request.companyName
          ? redactPersonalInformation(
              state.context.request.companyName
            )
          : null,
    },

    provider:
      state.provider,

    modelUsed:
      state.modelUsed,

    promptVersion:
      state.promptVersion,

    agentVersion:
      AGENT_VERSION,

    startedAt:
      state.startedAt,

    completedAt:
      state.completedAt,

    activeExecutionTimeMs:
      state.activeExecutionTimeMs,

    createdAt,

    updatedAt,
  };
};

// =====================================
// SAVE STATE AND RELEASE EXECUTION LOCK
// =====================================

const saveExecutionState = async (
  sessionId: string,
  userId: string,
  lockToken: string,
  state: AgentState
) => {
  const session =
    await AgentSession.findOneAndUpdate(
      {
        _id: sessionId,

        userId,

        isLocked: true,

        lockToken,
      },
      {
        $set: {
          ...buildSessionUpdate(state),

          isLocked: false,

          lockToken: null,

          lockedAt: null,
        },
      },
      {
        new: true,

        runValidators: true,
      }
    );

  if (!session) {
    throw new AgentSessionError(
      "Agent execution lock is no longer valid",
      409
    );
  }

  return buildPublicSession(
    String(session._id),

    state,

    session.title,

    session.createdAt,

    session.updatedAt
  );
};

// =====================================
// 1. CREATE AND EXECUTE AGENT SESSION
// =====================================

export const createAgentSession = async (
  userId: string,
  input: unknown
) => {
  validateId(userId, "user ID");

  const validation =
    agentRequestSchema.safeParse(input);

  if (!validation.success) {
    throw new AgentSessionError(
      validation.error.issues[0]?.message ||
        "Invalid agent request",

      400
    );
  }

  const request = validation.data;

  const initialState =
    createAgentState(
      userId,
      request
    );

  const lockToken = randomUUID();

  const title =
    generateSessionTitle(request.goal);

  // Persist the session before executing
  // any agent operations.

  const session =
    await AgentSession.create({
      userId,

      goal:
        redactPersonalInformation(
          request.goal
        ),

      title,

      ...buildSessionUpdate(initialState),

      status: "planning",

      isLocked: true,

      lockToken,

      lockedAt: new Date(),

      agentVersion: AGENT_VERSION,
    });

  const sessionId =
    String(session._id);

  console.log(
    "Agent session created:",
    sessionId
  );

  let finalState: AgentState;

  try {
    finalState =
      await startAgentExecution(
        userId,
        request
      );
  } catch (error) {
    failAgentState(
      initialState,
      getSafeError(error)
    );

    finalState = initialState;
  }

  // Save the resulting state whether the
  // run completed, failed or requires approval.

  return saveExecutionState(
    sessionId,
    userId,
    lockToken,
    finalState
  );
};

// =====================================
// 2. APPROVE OR DECLINE PENDING ACTION
// =====================================

export const approveAgentSession = async (
  userId: string,
  sessionId: string,
  input: unknown
) => {
  validateId(userId, "user ID");

  validateId(sessionId, "session ID");

  const validation =
    agentApprovalSchema.safeParse(input);

  if (!validation.success) {
    throw new AgentSessionError(
      "Invalid agent approval request",
      400
    );
  }

  const approval = validation.data;

  const lockToken = randomUUID();

  // Acquire the execution lock atomically.
  // Only one matching request can succeed.

  const session =
    await AgentSession.findOneAndUpdate(
      {
        _id: sessionId,

        userId,

        status: "awaiting_approval",

        isLocked: false,

        "state.status":
          "awaiting_approval",

        "state.pendingApproval.stepNumber":
          approval.stepNumber,
      },
      {
        $set: {
          isLocked: true,

          lockToken,

          lockedAt: new Date(),

          status: "executing",
        },
      },
      {
        new: true,
      }
    ).select("+state");

  if (!session) {
    const exists =
      await AgentSession.exists({
        _id: sessionId,
        userId,
      });

    if (!exists) {
      throw new AgentSessionError(
        "Agent session not found",
        404
      );
    }

    throw new AgentSessionError(
      "Session is busy or the pending approval is no longer valid",
      409
    );
  }

  // Load trusted server-side state.
  // Never accept agent state from the client.

  let state =
    session.state as AgentState;

  try {
    state =
      await resumeAgentExecution(
        userId,

        state,

        approval
      );
  } catch (error) {
    failAgentState(
      state,
      getSafeError(error)
    );
  }

  return saveExecutionState(
    sessionId,
    userId,
    lockToken,
    state
  );
};

// =====================================
// 3. GET ALL AGENT SESSIONS
// =====================================

export const getAgentSessions = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  validateId(userId, "user ID");

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(
      (page - 1) * limit
    )
  ) {
    throw new AgentSessionError(
      "Invalid pagination parameters",
      400
    );
  }

  const filter = { userId };

  const [sessions, total] =
    await Promise.all([
      AgentSession.find(filter)

        .select(
          "title goal status iteration totalToolCalls generativeToolCalls artifactCount agentVersion startedAt completedAt createdAt updatedAt isLocked"
        )

        .sort({
          createdAt: -1,
          _id: -1,
        })

        .skip(
          (page - 1) * limit
        )

        .limit(limit)

        .lean(),

      AgentSession.countDocuments(
        filter
      ),
    ]);

  return {
    sessions,

    pagination: {
      page,

      limit,

      total,

      totalPages:
        Math.ceil(total / limit),
    },
  };
};

// =====================================
// 4. GET INDIVIDUAL AGENT SESSION
// =====================================

export const getAgentSessionById = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(sessionId, "session ID");

  const session =
    await AgentSession.findOne({
      _id: sessionId,

      userId,
    })
      .select("+state")
      .lean();

  if (!session) {
    throw new AgentSessionError(
      "Agent session not found",
      404
    );
  }

  // Do not expose stale pending approvals
  // while another request is executing.

  if (session.isLocked) {
    return {
      _id:
        String(session._id),

      title:
        session.title,

      goal:
        session.goal,

      status:
        session.status,

      isLocked: true,

      pendingApproval: null,

      message:
        "Agent session is currently executing.",

      updatedAt:
        session.updatedAt,
    };
  }

  return {
    ...buildPublicSession(
      String(session._id),

      session.state,

      session.title,

      session.createdAt,

      session.updatedAt
    ),

    isLocked: false,
  };
};

// =====================================
// 5. CANCEL PAUSED AGENT SESSION
// =====================================

export const cancelAgentSession = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(sessionId, "session ID");

  const lockToken = randomUUID();

  const session =
    await AgentSession.findOneAndUpdate(
      {
        _id: sessionId,

        userId,

        isLocked: false,

        status: {
          $in: [
            "pending",
            "awaiting_approval",
          ],
        },
      },
      {
        $set: {
          isLocked: true,

          lockToken,

          lockedAt: new Date(),
        },
      },
      {
        new: true,
      }
    ).select("+state");

  if (!session) {
    const exists =
      await AgentSession.exists({
        _id: sessionId,
        userId,
      });

    if (!exists) {
      throw new AgentSessionError(
        "Agent session not found",
        404
      );
    }

    throw new AgentSessionError(
      "This session cannot currently be cancelled",
      409
    );
  }

  const state = session.state;

  if (state.pendingApproval) {
    const pendingStep =
      state.executionSteps.find(
        (step) =>
          step.stepNumber ===
          state.pendingApproval?.stepNumber
      );

    if (pendingStep) {
      pendingStep.status = "skipped";

      pendingStep.completedAt =
        new Date().toISOString();

      pendingStep.resultSummary =
        "Agent session cancelled by the user.";
    }
  }

  state.status = "cancelled";

  state.pendingApproval = null;

  state.clarification = null;

  state.completedAt =
    new Date().toISOString();

  state.errorMessage = null;

  state.finalResponse = {
    summary:
      "The agent session was cancelled by the user.",

    recommendations: [],

    limitations: [
      "Previously completed operations and saved reports have not been deleted.",
    ],

    artifacts:
      state.artifacts,
  };

  return saveExecutionState(
    sessionId,
    userId,
    lockToken,
    state
  );
};

// =====================================
// 6. DELETE AGENT SESSION
// =====================================

export const deleteAgentSession = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(sessionId, "session ID");

  const session =
    await AgentSession.findOneAndDelete({
      _id: sessionId,

      userId,

      isLocked: false,
    });

  if (!session) {
    const exists =
      await AgentSession.exists({
        _id: sessionId,
        userId,
      });

    if (exists) {
      throw new AgentSessionError(
        "Cannot delete an executing agent session",
        409
      );
    }

    throw new AgentSessionError(
      "Agent session not found",
      404
    );
  }

  return {
    sessionId,

    message:
      "Agent session deleted successfully",
  };
};
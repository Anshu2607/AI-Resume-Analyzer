import mongoose, {
  Schema,
  Types,
} from "mongoose";

import type {
  AgentState,
} from "../agents/agentState.js";

import type {
  AgentStatus,
} from "../validators/agent.validator.js";

// =====================================
// AGENT SESSION INTERFACE
// =====================================

export interface IAgentSession {
  userId: Types.ObjectId;

  goal: string;

  title: string;

  status: AgentStatus;

  state: AgentState;

  iteration: number;

  totalToolCalls: number;

  generativeToolCalls: number;

  artifactCount: number;

  isLocked: boolean;

  lockToken: string | null;

  lockedAt: Date | null;

  agentVersion: string;

  startedAt: Date;

  completedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

// =====================================
// AGENT SESSION SCHEMA
// =====================================

const agentSessionSchema =
  new Schema<IAgentSession>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      goal: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "planning",
          "executing",
          "awaiting_approval",
          "completed",
          "failed",
          "cancelled",
        ],
        default: "pending",
        required: true,
      },

      // Complete agent execution snapshot

      state: {
        type: Schema.Types.Mixed,
        required: true,
        select: false,
      },

      iteration: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalToolCalls: {
        type: Number,
        default: 0,
        min: 0,
      },

      generativeToolCalls: {
        type: Number,
        default: 0,
        min: 0,
      },

      artifactCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      // Atomic session locking

      isLocked: {
        type: Boolean,
        default: false,
      },

      lockToken: {
        type: String,
        default: null,
        select: false,
      },

      lockedAt: {
        type: Date,
        default: null,
      },

      agentVersion: {
        type: String,
        required: true,
      },

      startedAt: {
        type: Date,
        required: true,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,

      collection: "agent_sessions",

      optimisticConcurrency: true,
    }
  );

// =====================================
// DATABASE INDEXES
// =====================================

agentSessionSchema.index({
  userId: 1,
  createdAt: -1,
  _id: -1,
});

agentSessionSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

agentSessionSchema.index({
  isLocked: 1,
  lockedAt: 1,
});

// =====================================
// EXPORT MODEL
// =====================================

const AgentSession =
  mongoose.model<IAgentSession>(
    "AgentSession",
    agentSessionSchema
  );

export default AgentSession;
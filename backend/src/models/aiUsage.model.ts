import mongoose, {
  Schema,
  Types,
} from "mongoose";

export interface IAIUsage {
  userId: Types.ObjectId | null;
  provider: string;
  model: string;
  feature: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  outcome: "success" | "failure";
  durationMs: number;
  isFallback: boolean;
  requestId: string | null;
  createdAt: Date;
}

const aiUsageSchema = new Schema<IAIUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    provider: {
      type: String,
      required: true,
      enum: ["groq", "gemini"],
    },

    model: {
      type: String,
      required: true,
      maxlength: 150,
    },

    feature: {
      type: String,
      required: true,
      maxlength: 100,
      default: "UNKNOWN",
    },

    inputTokens: {
      type: Number,
      min: 0,
      default: null,
    },

    outputTokens: {
      type: Number,
      min: 0,
      default: null,
    },

    totalTokens: {
      type: Number,
      min: 0,
      default: null,
    },

    estimatedCostUsd: {
      type: Number,
      min: 0,
      default: null,
    },

    outcome: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },

    durationMs: {
      type: Number,
      required: true,
      min: 0,
    },

    isFallback: {
      type: Boolean,
      default: false,
    },

    requestId: {
      type: String,
      maxlength: 100,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
      immutable: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

// User-wise usage.
aiUsageSchema.index({
  userId: 1,
  createdAt: -1,
});

// Provider-wise usage.
aiUsageSchema.index({
  provider: 1,
  createdAt: -1,
});

// Model-wise usage.
aiUsageSchema.index({
  model: 1,
  createdAt: -1,
});

// Feature-wise usage.
aiUsageSchema.index({
  feature: 1,
  createdAt: -1,
});

// Provider outcome statistics.
aiUsageSchema.index({
  outcome: 1,
  createdAt: -1,
});

// Automatically expire usage records after 90 days.
aiUsageSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
  }
);

const AIUsage = mongoose.model<IAIUsage>(
  "AIUsage",
  aiUsageSchema
);

export default AIUsage;
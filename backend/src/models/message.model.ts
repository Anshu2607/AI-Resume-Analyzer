import mongoose, { Schema, Types } from "mongoose";

export interface ISupportingEvidence {
  sourceId: string;
  evidence: string;
}

export interface IMessageSource {
  sourceId: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface IMessageMetadata {
  provider: "groq" | "gemini" | null;
  modelUsed: string | null;
  promptVersion: string;
  confidence: "high" | "medium" | "low";
  insufficientContext: boolean;
  retrievalTime: number;
  processingTime: number;
}

export interface IMessage {
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;

  supportingEvidence: ISupportingEvidence[];
  sources: IMessageSource[];
  followUpQuestions: string[];

  metadata?: IMessageMetadata;

  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema<ISupportingEvidence>(
  {
    sourceId: {
      type: String,
      required: true,
    },

    evidence: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const sourceSchema = new Schema<IMessageSource>(
  {
    sourceId: {
      type: String,
      required: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    _id: false,
  }
);

const metadataSchema = new Schema<IMessageMetadata>(
  {
    provider: {
      type: String,
      enum: ["groq", "gemini", null],
      default: null,
    },

    modelUsed: {
      type: String,
      default: null,
    },

    promptVersion: {
      type: String,
      required: true,
    },

    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
    },

    insufficientContext: {
      type: Boolean,
      default: false,
    },

    retrievalTime: {
      type: Number,
      min: 0,
      default: 0,
    },

    processingTime: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new Schema<IMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },

    supportingEvidence: {
      type: [evidenceSchema],
      default: [],
    },

    sources: {
      type: [sourceSchema],
      default: [],
    },

    followUpQuestions: {
      type: [String],
      default: [],
    },

    metadata: {
      type: metadataSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "messages",
  }
);

// Retrieve messages in chronological order
messageSchema.index({
  userId: 1,
  conversationId: 1,
  createdAt: 1,
  _id: 1,
});

const Message = mongoose.model<IMessage>(
  "Message",
  messageSchema
);

export default Message;
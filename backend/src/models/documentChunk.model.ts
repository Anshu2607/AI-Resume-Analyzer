import mongoose, { Schema, Types } from "mongoose";

export interface IDocumentChunk {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  chunkIndex: number;
  content: string;
  characterCount: number;
  embedding: number[];
  embeddingModel: string;
  embeddingDimensions: number;
  embeddingVersion: string;
  chunkingVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
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
      trim: true,
    },

    characterCount: {
      type: Number,
      required: true,
      min: 1,
    },

    embedding: {
      type: [Number],
      required: true,
      select: false,

      validate: {
        validator: (values: number[]) =>
          values.length === 384 &&
          values.every(Number.isFinite),

        message:
          "Embedding must contain 384 valid numerical values",
      },
    },

    embeddingModel: {
      type: String,
      required: true,
    },

    embeddingDimensions: {
      type: Number,
      required: true,
      enum: [384],
    },

    embeddingVersion: {
      type: String,
      required: true,
    },

    chunkingVersion: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "document_chunks",
  }
);

// Prevent duplicate chunks for the same resume
documentChunkSchema.index(
  {
    userId: 1,
    resumeId: 1,
    chunkIndex: 1,
  },
  {
    unique: true,
  }
);

const DocumentChunk = mongoose.model<IDocumentChunk>(
  "DocumentChunk",
  documentChunkSchema
);

export default DocumentChunk;
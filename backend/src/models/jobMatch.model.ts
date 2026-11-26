import mongoose, { Schema, Types } from "mongoose";

import type {
  JobMatchingResponse,
} from "../validators/jobMatching.validator.js";

export interface IJobMatch {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;

  jobTitle: string;
  companyName: string;
  jobDescription: string;

  result: JobMatchingResponse;

  overallScore: number;

  compatibilityLevel:
    | "excellent"
    | "good"
    | "moderate"
    | "limited"
    | "low";

  semanticScore: number;

  averageSimilarity: number;

  scores: {
    semanticSimilarity: number;
    technicalSkills: number;
    experience: number;
    education: number;
    projectRelevance: number;
  };

  weights: {
    semanticSimilarity: number;
    technicalSkills: number;
    experience: number;
    education: number;
    projectRelevance: number;
  };

  resumeChunkCount: number;
  jobChunkCount: number;

  provider: "groq" | "gemini";

  modelUsed: string;
  embeddingModel: string;

  promptVersion: string;
  scoringVersion: string;
  similarityVersion: string;

  similarityProcessingTime: number;
  processingTime: number;

  createdAt: Date;
  updatedAt: Date;
}

const jobMatchSchema = new Schema<IJobMatch>(
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

    jobTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    companyName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "Not specified",
    },

    jobDescription: {
      type: String,
      required: true,
      maxlength: 20000,
    },

    result: {
      type: Schema.Types.Mixed,
      required: true,
    },

    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    compatibilityLevel: {
      type: String,
      enum: [
        "excellent",
        "good",
        "moderate",
        "limited",
        "low",
      ],
      required: true,
    },

    semanticScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    averageSimilarity: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    scores: {
      semanticSimilarity: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      technicalSkills: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      experience: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      education: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      projectRelevance: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },

    weights: {
      semanticSimilarity: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },

      technicalSkills: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },

      experience: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },

      education: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },

      projectRelevance: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
    },

    resumeChunkCount: {
      type: Number,
      required: true,
      min: 1,
    },

    jobChunkCount: {
      type: Number,
      required: true,
      min: 1,
    },

    provider: {
      type: String,
      enum: ["groq", "gemini"],
      required: true,
    },

    modelUsed: {
      type: String,
      required: true,
    },

    embeddingModel: {
      type: String,
      required: true,
    },

    promptVersion: {
      type: String,
      required: true,
    },

    scoringVersion: {
      type: String,
      required: true,
    },

    similarityVersion: {
      type: String,
      required: true,
    },

    similarityProcessingTime: {
      type: Number,
      required: true,
      min: 0,
    },

    processingTime: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "job_matches",
  }
);

// Retrieve recent job matching reports
jobMatchSchema.index({
  userId: 1,
  createdAt: -1,
});

// Retrieve reports associated with a resume
jobMatchSchema.index({
  userId: 1,
  resumeId: 1,
  createdAt: -1,
});

const JobMatch = mongoose.model<IJobMatch>(
  "JobMatch",
  jobMatchSchema
);

export default JobMatch;
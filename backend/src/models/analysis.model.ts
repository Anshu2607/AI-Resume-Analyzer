import mongoose, { Schema, Types } from "mongoose";

import type {
  AnalysisResult,
} from "../validators/analysis.validator.js";

export interface IAnalysis {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  result: AnalysisResult;
  overallScore: number;
  modelUsed: string;
  promptVersion: string;
  scoringVersion: string;
  processingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const assessmentSchema = new Schema(
  {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    explanation: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const resultSchema = new Schema(
  {
    professionalSummary: {
      type: String,
      required: true,
    },

    technicalSkills: [String],

    softSkills: [String],

    strengths: [String],

    weaknesses: [String],

    missingSections: [String],

    improvementSuggestions: [
      {
        _id: false,
        section: String,
        suggestion: String,
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
        },
      },
    ],

    recommendedRoles: [
      {
        _id: false,
        role: String,
        reason: String,
      },
    ],

    assessment: {
      technicalSkills: assessmentSchema,
      experience: assessmentSchema,
      projects: assessmentSchema,
      education: assessmentSchema,
      resumeStructure: assessmentSchema,
      achievements: assessmentSchema,
    },
  },
  { _id: false }
);

const analysisSchema = new Schema<IAnalysis>(
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

    result: {
      type: resultSchema,
      required: true,
    },

    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    modelUsed: {
      type: String,
      required: true,
    },

    promptVersion: {
      type: String,
      default: "1.0.0",
    },

    scoringVersion: {
      type: String,
      default: "1.0.0",
    },

    processingTime: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

analysisSchema.index({
  userId: 1,
  createdAt: -1,
});

analysisSchema.index({
  userId: 1,
  resumeId: 1,
  createdAt: -1,
});

const Analysis = mongoose.model<IAnalysis>(
  "Analysis",
  analysisSchema
);

export default Analysis;
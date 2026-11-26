import mongoose, {
  Schema,
  Types,
} from "mongoose";

import type {
  RoadmapDifficulty,
  RoadmapResponse,
  RoadmapStatus,
} from "../validators/roadmap.validator.js";

import type {
  SkillGapItem,
} from "../validators/skillGap.validator.js";

// =====================================
// ACTIVITY PROGRESS INTERFACE
// =====================================

export interface IActivityProgress {
  week: number;
  activityIndex: number;
  completed: boolean;
  completedAt: Date | null;
}

// =====================================
// ROADMAP INTERFACE
// =====================================

export interface IRoadmap {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  jobMatchId: Types.ObjectId;

  jobTitle: string;
  companyName: string;

  durationWeeks: number;
  hoursPerWeek: number;
  totalLearningHours: number;
  estimatedLearningHours: number;

  difficulty: RoadmapDifficulty;

  skillGaps: SkillGapItem[];

  result: RoadmapResponse;

  status: RoadmapStatus;

  activityProgress: IActivityProgress[];

  totalActivities: number;
  completedActivities: number;
  progressPercentage: number;

  startedAt: Date | null;
  completedAt: Date | null;

  provider: "groq" | "gemini";

  modelUsed: string;
  promptVersion: string;
  skillGapAnalysisVersion: string;

  processingTime: number;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================
// SKILL GAP SCHEMA
// =====================================

const skillGapSchema =
  new Schema<SkillGapItem>(
    {
      skill: {
        type: String,
        required: true,
        trim: true,
      },

      importance: {
        type: String,
        enum: [
          "required",
          "preferred",
        ],
        required: true,
      },

      priority: {
        type: String,
        enum: [
          "critical",
          "high",
          "medium",
          "low",
        ],
        required: true,
      },

      priorityScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      evidenceStatus: {
        type: String,
        enum: ["not_evidenced"],
        required: true,
        default: "not_evidenced",
      },

      recommendation: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// ACTIVITY PROGRESS SCHEMA
// =====================================

const activityProgressSchema =
  new Schema<IActivityProgress>(
    {
      week: {
        type: Number,
        required: true,
        min: 1,
        max: 24,
      },

      activityIndex: {
        type: Number,
        required: true,
        min: 0,
        max: 7,
      },

      completed: {
        type: Boolean,
        default: false,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// ROADMAP SCHEMA
// =====================================

const roadmapSchema =
  new Schema<IRoadmap>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      resumeId: {
        type: Schema.Types.ObjectId,
        ref: "Resume",
        required: true,
      },

      jobMatchId: {
        type: Schema.Types.ObjectId,
        ref: "JobMatch",
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
        default: "Not specified",
        maxlength: 150,
      },

      durationWeeks: {
        type: Number,
        required: true,
        min: 1,
        max: 24,
      },

      hoursPerWeek: {
        type: Number,
        required: true,
        min: 2,
        max: 40,
      },

      totalLearningHours: {
        type: Number,
        required: true,
        min: 2,
        max: 960,
      },

      estimatedLearningHours: {
        type: Number,
        required: true,
        min: 0,
        max: 960,
      },

      difficulty: {
        type: String,
        enum: [
          "beginner",
          "intermediate",
          "advanced",
        ],
        default: "intermediate",
      },

      // Corrected typed nested schema

      skillGaps: {
        type: [skillGapSchema],
        required: true,
        default: [],
      },

      result: {
        type: Schema.Types.Mixed,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "not_started",
          "in_progress",
          "completed",
          "archived",
        ],
        default: "not_started",
      },

      activityProgress: {
        type: [activityProgressSchema],
        default: [],
      },

      totalActivities: {
        type: Number,
        required: true,
        min: 1,
      },

      completedActivities: {
        type: Number,
        default: 0,
        min: 0,
      },

      progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
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

      promptVersion: {
        type: String,
        required: true,
      },

      skillGapAnalysisVersion: {
        type: String,
        required: true,
      },

      processingTime: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      timestamps: true,

      collection: "career_roadmaps",

      optimisticConcurrency: true,
    }
  );

// =====================================
// DATABASE INDEXES
// =====================================

roadmapSchema.index({
  userId: 1,
  createdAt: -1,
});

roadmapSchema.index({
  userId: 1,
  jobMatchId: 1,
  createdAt: -1,
});

roadmapSchema.index({
  userId: 1,
  status: 1,
});

// =====================================
// EXPORT MODEL
// =====================================

const Roadmap =
  mongoose.model<IRoadmap>(
    "Roadmap",
    roadmapSchema
  );

export default Roadmap;
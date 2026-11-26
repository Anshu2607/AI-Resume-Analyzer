import mongoose, {
  Schema,
  Types,
} from "mongoose";

import type {
  InterviewType,
  InterviewDifficulty,
  InterviewStatus,
  InterviewQuestion,
  InterviewAnswer,
  InterviewEvaluation,
  InterviewReport,
  EvaluationScores,
} from "../validators/interview.validator.js";

// =====================================
// INTERVIEW CONTEXT INTERFACE
// =====================================

export interface IInterviewContext {
  resumeContext: string | null;

  jobContext: string | null;

  identifiedSkillGaps: string[];
}

// =====================================
// INTERVIEW SESSION INTERFACE
// =====================================

export interface IInterviewSession {
  userId: Types.ObjectId;

  resumeId: Types.ObjectId | null;

  jobMatchId: Types.ObjectId | null;

  interviewType: InterviewType;

  targetRole: string;

  companyName: string | null;

  initialDifficulty: InterviewDifficulty;

  currentDifficulty: InterviewDifficulty;

  questionCount: number;

  topics: string[];

  adaptiveDifficulty: boolean;

  enableFollowUps: boolean;

  consent: boolean;

  status: InterviewStatus;

  context: IInterviewContext;

  questions: InterviewQuestion[];

  answers: InterviewAnswer[];

  currentQuestionIndex: number;

  answeredQuestions: number;

  skippedQuestions: number;

  followUpCount: number;

  progressPercentage: number;

  averageScore: number | null;

  report: InterviewReport | null;

  provider: "groq" | "gemini" | null;

  modelUsed: string | null;

  interviewVersion: string;

  isLocked: boolean;

  lockToken: string | null;

  lockedAt: Date | null;

  startedAt: Date | null;

  completedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

// =====================================
// SCORE FIELD CONFIGURATION
// =====================================

const scoreField = {
  type: Number,
  required: true,
  min: 0,
  max: 100,
};

// =====================================
// EVALUATION SCORES SCHEMA
// =====================================

const evaluationScoresSchema =
  new Schema<EvaluationScores>(
    {
      accuracy: scoreField,

      relevance: scoreField,

      completeness: scoreField,

      clarity: scoreField,
    },
    {
      _id: false,
    }
  );

// =====================================
// INTERVIEW CONTEXT SCHEMA
// =====================================

const interviewContextSchema =
  new Schema<IInterviewContext>(
    {
      resumeContext: {
        type: String,
        default: null,
        maxlength: 6000,
      },

      jobContext: {
        type: String,
        default: null,
        maxlength: 6000,
      },

      identifiedSkillGaps: {
        type: [String],
        default: [],
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// QUESTION SCHEMA
// =====================================

const interviewQuestionSchema =
  new Schema<InterviewQuestion>(
    {
      questionId: {
        type: String,
        required: true,
      },

      questionNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 15,
      },

      question: {
        type: String,
        required: true,
        maxlength: 2000,
      },

      category: {
        type: String,
        required: true,
        enum: [
          "technical",
          "conceptual",
          "scenario_based",
          "problem_solving",
          "project_based",
          "resume_based",
          "behavioral",
          "hr",
          "system_design",
        ],
      },

      topic: {
        type: String,
        required: true,
        maxlength: 150,
      },

      difficulty: {
        type: String,
        required: true,
        enum: [
          "beginner",
          "intermediate",
          "advanced",
        ],
      },

      expectedAnswer: {
        type: String,
        required: true,
        maxlength: 5000,
      },

      keyPoints: {
        type: [String],
        required: true,
        validate: {
          validator: (items: string[]) =>
            items.length >= 1 &&
            items.length <= 10,

          message: "Invalid question key points",
        },
      },

      isFollowUp: {
        type: Boolean,
        default: false,
      },

      parentQuestionId: {
        type: String,
        default: null,
      },

      generatedAt: {
        type: String,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// ANSWER EVALUATION SCHEMA
// =====================================

const interviewEvaluationSchema =
  new Schema<InterviewEvaluation>(
    {
      scores: {
        type: evaluationScoresSchema,
        required: true,
      },

      overallScore: scoreField,

      feedback: {
        type: String,
        required: true,
        maxlength: 3000,
      },

      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      missingKeyPoints: {
        type: [String],
        default: [],
      },

      improvementSuggestions: {
        type: [String],
        default: [],
      },

      modelAnswer: {
        type: String,
        required: true,
        maxlength: 5000,
      },

      recommendFollowUp: {
        type: Boolean,
        default: false,
      },

      followUpFocus: {
        type: String,
        default: null,
        maxlength: 500,
      },

      provider: {
        type: String,
        required: true,
        enum: ["groq", "gemini"],
      },

      modelUsed: {
        type: String,
        required: true,
      },

      promptVersion: {
        type: String,
        required: true,
      },

      processingTime: {
        type: Number,
        required: true,
        min: 0,
      },

      evaluatedAt: {
        type: String,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// INTERVIEW ANSWER SCHEMA
// =====================================

const interviewAnswerSchema =
  new Schema<InterviewAnswer>(
    {
      questionId: {
        type: String,
        required: true,
      },

      answer: {
        type: String,
        default: "",
        maxlength: 10000,
      },

      status: {
        type: String,
        required: true,
        enum: ["answered", "skipped"],
      },

      evaluation: {
        type: interviewEvaluationSchema,
        default: null,
      },

      submittedAt: {
        type: String,
        required: true,
      },
    },
    {
      _id: false,
    }
  );

// =====================================
// MAIN INTERVIEW SESSION SCHEMA
// =====================================

const interviewSessionSchema =
  new Schema<IInterviewSession>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      resumeId: {
        type: Schema.Types.ObjectId,
        ref: "Resume",
        default: null,
      },

      jobMatchId: {
        type: Schema.Types.ObjectId,
        ref: "JobMatch",
        default: null,
      },

      interviewType: {
        type: String,
        required: true,
        enum: [
          "technical",
          "hr",
          "behavioral",
          "resume_based",
          "job_specific",
          "mixed",
        ],
      },

      targetRole: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      companyName: {
        type: String,
        default: null,
        maxlength: 150,
      },

      initialDifficulty: {
        type: String,
        required: true,
        enum: [
          "beginner",
          "intermediate",
          "advanced",
        ],
      },

      currentDifficulty: {
        type: String,
        required: true,
        enum: [
          "beginner",
          "intermediate",
          "advanced",
        ],
      },

      questionCount: {
        type: Number,
        required: true,
        min: 3,
        max: 15,
      },

      topics: {
        type: [String],
        default: [],
      },

      adaptiveDifficulty: {
        type: Boolean,
        default: true,
      },

      enableFollowUps: {
        type: Boolean,
        default: true,
      },

      consent: {
        type: Boolean,
        required: true,
        validate: {
          validator: (value: boolean) =>
            value === true,

          message:
            "External AI processing consent is required",
        },
      },

      status: {
        type: String,
        required: true,
        enum: [
          "not_started",
          "in_progress",
          "completed",
          "cancelled",
        ],
        default: "not_started",
      },

      // Internal context is excluded from
      // ordinary database queries.

      context: {
        type: interviewContextSchema,
        required: true,
        select: false,
      },

      // Questions include private grading criteria.
      // Public responses must use a safe projection.

      questions: {
        type: [interviewQuestionSchema],
        default: [],
        select: false,
      },

      answers: {
        type: [interviewAnswerSchema],
        default: [],
        select: false,
      },

      currentQuestionIndex: {
        type: Number,
        default: 0,
        min: 0,
        max: 15,
      },

      answeredQuestions: {
        type: Number,
        default: 0,
        min: 0,
        max: 15,
      },

      skippedQuestions: {
        type: Number,
        default: 0,
        min: 0,
        max: 15,
      },

      followUpCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 3,
      },

      progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      averageScore: {
        type: Number,
        default: null,
        min: 0,
        max: 100,
      },

      // Validated with interviewReportSchema
      // before persistence in the service layer.

      report: {
        type: Schema.Types.Mixed,
        default: null,
      },

      provider: {
        type: String,
        enum: ["groq", "gemini"],
        default: null,
      },

      modelUsed: {
        type: String,
        default: null,
      },

      interviewVersion: {
        type: String,
        required: true,
      },

      // Prevent concurrent answer submissions.

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

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,

      collection: "interview_sessions",

      optimisticConcurrency: true,
    }
  );

// =====================================
// DATABASE INDEXES
// =====================================

interviewSessionSchema.index({
  userId: 1,
  createdAt: -1,
  _id: -1,
});

interviewSessionSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

interviewSessionSchema.index({
  userId: 1,
  interviewType: 1,
  createdAt: -1,
});

interviewSessionSchema.index({
  userId: 1,
  resumeId: 1,
});

interviewSessionSchema.index({
  userId: 1,
  jobMatchId: 1,
});

interviewSessionSchema.index({
  isLocked: 1,
  lockedAt: 1,
});

// =====================================
// EXPORT MODEL
// =====================================

const InterviewSession =
  mongoose.model<IInterviewSession>(
    "InterviewSession",
    interviewSessionSchema
  );

export default InterviewSession;
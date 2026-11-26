import { randomUUID } from "node:crypto";
import { Types } from "mongoose";

import {
  ACTIVITY_TYPES,
} from "../config/activity.config.js";

import {
  recordSuccessfulActivity,
} from "./activity.service.js";

import InterviewSession from "../models/interviewSession.model.js";

import type {
  IInterviewSession,
  IInterviewContext,
} from "../models/interviewSession.model.js";

import Resume from "../models/resume.model.js";

import {
  INTERVIEW_CONFIG,
  INTERVIEW_VERSION,
} from "../config/interview.config.js";

import {
  createInterviewSchema,
  interviewAnswerSchema,
  submitInterviewAnswerSchema,
  skipInterviewQuestionSchema,
} from "../validators/interview.validator.js";

import type {
  CreateInterviewRequest,
  InterviewAnswer,
} from "../validators/interview.validator.js";

import {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  getPublicInterviewQuestion,
} from "./interviewAI.service.js";

import {
  determineNextInterviewAction,
  calculateInterviewProgress,
  calculateAverageInterviewScore,
} from "../utils/interviewAdaptive.utils.js";

import {
  getJobMatchById,
} from "./jobMatching.service.js";

import {
  getSkillGapReport,
} from "./roadmap.service.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

// =====================================
// CUSTOM SESSION ERROR
// =====================================

export class InterviewSessionError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "InterviewSessionError";
  }
}

// =====================================
// VALIDATE MONGODB ID
// =====================================

const validateId = (
  id: string,
  field: string
): void => {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new InterviewSessionError(
      `Invalid ${field}`,
      400
    );
  }
};

// =====================================
// SANITIZE CONTEXT
// =====================================

const sanitizeContext = (
  value: string,
  maxLength: number
): string => {
  return redactPersonalInformation(value)
    .slice(0, maxLength)
    .trim();
};

// =====================================
// RETRIEVE INTERVIEW CONTEXT
// =====================================

const buildInterviewContext = async (
  userId: string,
  input: CreateInterviewRequest
): Promise<IInterviewContext> => {
  const context: IInterviewContext = {
    resumeContext: null,
    jobContext: null,
    identifiedSkillGaps: [],
  };

  // Retrieve owned resume

  if (input.resumeId) {
    validateId(input.resumeId, "resume ID");

    const resume = await Resume.findOne({
      _id: input.resumeId,
      userId,
    })
      .select("+extractedText")
      .lean();

    if (!resume) {
      throw new InterviewSessionError(
        "Resume not found",
        404
      );
    }

    if (!resume.extractedText?.trim()) {
      throw new InterviewSessionError(
        "Resume does not contain extracted text",
        422
      );
    }

    context.resumeContext = sanitizeContext(
      resume.extractedText,
      INTERVIEW_CONFIG.maxResumeContextCharacters
    );
  }

  // Retrieve owned job matching report

  if (input.jobMatchId) {
    validateId(
      input.jobMatchId,
      "job matching ID"
    );

    const jobMatch = await getJobMatchById(
      userId,
      input.jobMatchId
    );

    const jobContext = {
      jobTitle: jobMatch.jobTitle,
      companyName: jobMatch.companyName,
      jobDescription: jobMatch.jobDescription,
      overallScore: jobMatch.overallScore,
    };

    context.jobContext = sanitizeContext(
      JSON.stringify(jobContext),
      INTERVIEW_CONFIG.maxJobContextCharacters
    );

    // Retrieve deterministic skill gap analysis

    const skillGapReport =
      await getSkillGapReport(
        userId,
        input.jobMatchId
      );

    context.identifiedSkillGaps =
      skillGapReport.skillGaps
        .slice(0, 25)
        .map((item) =>
          sanitizeContext(item.skill, 150)
        )
        .filter(Boolean);

    // Prevent mixing unrelated resume and job reports

    if (
      input.resumeId &&
      String(jobMatch.resumeId).toLowerCase() !==
        input.resumeId.toLowerCase()
    ) {
      throw new InterviewSessionError(
        "Selected job matching report belongs to a different resume",
        422
      );
    }
  }

  return context;
};

// =====================================
// PUBLIC SESSION PROJECTION
// =====================================

const getPublicSession = (
  session: IInterviewSession & {
    _id: Types.ObjectId;
  }
) => {
  const currentQuestion =
    session.status === "in_progress"
      ? session.questions[
          session.currentQuestionIndex
        ]
      : undefined;

  const answersByQuestion = new Map(
    session.answers.map((answer) => [
      answer.questionId,
      answer,
    ])
  );

  return {
    _id: session._id.toString(),

    resumeId:
      session.resumeId?.toString() ?? null,

    jobMatchId:
      session.jobMatchId?.toString() ?? null,

    interviewType:
      session.interviewType,

    targetRole:
      session.targetRole,

    companyName:
      session.companyName,

    initialDifficulty:
      session.initialDifficulty,

    currentDifficulty:
      session.currentDifficulty,

    questionCount:
      session.questionCount,

    topics:
      session.topics,

    adaptiveDifficulty:
      session.adaptiveDifficulty,

    enableFollowUps:
      session.enableFollowUps,

    status:
      session.status,

    currentQuestionIndex:
      session.currentQuestionIndex,

    currentQuestion:
      currentQuestion
        ? getPublicInterviewQuestion(
            currentQuestion
          )
        : null,

    questions:
      session.questions.map((question) => ({
        ...getPublicInterviewQuestion(question),

        answer:
          answersByQuestion.get(
            question.questionId
          ) ?? null,
      })),

    answeredQuestions:
      session.answeredQuestions,

    skippedQuestions:
      session.skippedQuestions,

    followUpCount:
      session.followUpCount,

    progressPercentage:
      session.progressPercentage,

    averageScore:
      session.averageScore,

    report:
      session.report,

    provider:
      session.provider,

    modelUsed:
      session.modelUsed,

    interviewVersion:
      session.interviewVersion,

    isLocked:
      session.isLocked,

    startedAt:
      session.startedAt,

    completedAt:
      session.completedAt,

    createdAt:
      session.createdAt,

    updatedAt:
      session.updatedAt,
  };
};

// =====================================
// CREATE INTERVIEW SESSION
// =====================================

export const createInterviewSession = async (
  userId: string,
  request: CreateInterviewRequest
) => {
  validateId(userId, "user ID");

  const validation =
    createInterviewSchema.safeParse(request);

  if (!validation.success) {
    throw new InterviewSessionError(
      "Invalid interview configuration",
      400
    );
  }

  const input = validation.data;

  const context =
    await buildInterviewContext(
      userId,
      input
    );

  // Generate first interview question

  const firstQuestion =
    await generateInterviewQuestion({
      interviewType:
        input.interviewType,

      targetRole:
        input.targetRole,

      companyName:
        input.companyName || null,

      difficulty:
        input.difficulty,

      questionNumber: 1,

      totalQuestions:
        input.questionCount,

      topics:
        input.topics,

      resumeContext:
        context.resumeContext,

      jobContext:
        context.jobContext,

      identifiedSkillGaps:
        context.identifiedSkillGaps,

      previousQuestions: [],

      previousAnswers: [],

      isFollowUp: false,

      parentQuestionId: null,

      followUpFocus: null,
    });

  // Persist interview session

  const session =
    await InterviewSession.create({
      userId:
        new Types.ObjectId(userId),

      resumeId:
        input.resumeId
          ? new Types.ObjectId(input.resumeId)
          : null,

      jobMatchId:
        input.jobMatchId
          ? new Types.ObjectId(input.jobMatchId)
          : null,

      interviewType:
        input.interviewType,

      targetRole:
        input.targetRole,

      companyName:
        input.companyName || null,

      initialDifficulty:
        input.difficulty,

      currentDifficulty:
        input.difficulty,

      questionCount:
        input.questionCount,

      topics:
        input.topics,

      adaptiveDifficulty:
        input.adaptiveDifficulty,

      enableFollowUps:
        input.enableFollowUps,

      consent: true,

      status: "in_progress",

      context,

      questions: [
        firstQuestion.question,
      ],

      answers: [],

      currentQuestionIndex: 0,

      answeredQuestions: 0,

      skippedQuestions: 0,

      followUpCount: 0,

      progressPercentage: 0,

      averageScore: null,

      report: null,

      provider:
        firstQuestion.provider,

      modelUsed:
        firstQuestion.modelUsed,

      interviewVersion:
        INTERVIEW_VERSION,

      isLocked: false,

      lockToken: null,

      lockedAt: null,

      startedAt: new Date(),

      completedAt: null,
    });

  console.log(
    "Interview session created:",
    session._id.toString()
  );

  return getPublicSession(session);
};

// =====================================
// ACQUIRE ATOMIC SESSION LOCK
// =====================================

const acquireSessionLock = async (
  userId: string,
  sessionId: string,
  questionId: string
) => {
  validateId(userId, "user ID");
  validateId(sessionId, "session ID");

  const lockToken = randomUUID();

  const session =
    await InterviewSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId,

        status: "in_progress",

        isLocked: false,

        // Only the current unanswered
        // question may be submitted.

        "answers.questionId": {
          $ne: questionId,
        },

        $expr: {
          $eq: [
            {
              $arrayElemAt: [
                "$questions.questionId",
                "$currentQuestionIndex",
              ],
            },
            questionId,
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
    ).select(
      "+context +questions +answers +lockToken"
    );

  if (!session) {
    const existing =
      await InterviewSession.findOne({
        _id: sessionId,
        userId,
      });

    if (!existing) {
      throw new InterviewSessionError(
        "Interview session not found",
        404
      );
    }

    if (existing.isLocked) {
      throw new InterviewSessionError(
        "An interview operation is already in progress",
        409
      );
    }

    if (
      existing.status !== "in_progress"
    ) {
      throw new InterviewSessionError(
        "Interview is not in progress",
        409
      );
    }

    throw new InterviewSessionError(
      "Question is no longer active or has already been submitted",
      409
    );
  }

  return {
    session,
    lockToken,
  };
};

// =====================================
// RELEASE SESSION LOCK
// =====================================

const releaseSessionLock = async (
  userId: string,
  sessionId: string,
  lockToken: string
): Promise<void> => {
  await InterviewSession.updateOne(
    {
      _id: sessionId,
      userId,
      lockToken,
      isLocked: true,
    },
    {
      $set: {
        isLocked: false,
        lockToken: null,
        lockedAt: null,
      },
    }
  );
};

// =====================================
// PROCESS ANSWER OR SKIPPED QUESTION
// =====================================

const processInterviewQuestion = async (
  userId: string,
  sessionId: string,
  questionId: string,
  candidateAnswer: string | null
) => {
  const {
    session,
    lockToken,
  } = await acquireSessionLock(
    userId,
    sessionId,
    questionId
  );

  try {
    if (!session.consent) {
      throw new InterviewSessionError(
        "External AI processing consent is required",
        403
      );
    }

    const currentQuestion =
      session.questions[
        session.currentQuestionIndex
      ];

    if (
      !currentQuestion ||
      currentQuestion.questionId !== questionId
    ) {
      throw new InterviewSessionError(
        "Invalid current interview question",
        409
      );
    }

    const existingQuestions =
      session.questions.map(
        (question) => question
      );

    const existingAnswers =
      session.answers.map(
        (answer) => answer
      );

    let newAnswer: InterviewAnswer;

    let latestProvider =
      session.provider;

    let latestModel =
      session.modelUsed;

    // =================================
    // EVALUATE CANDIDATE ANSWER
    // =================================

    if (candidateAnswer !== null) {
      const evaluation =
        await evaluateInterviewAnswer({
          interviewType:
            session.interviewType,

          targetRole:
            session.targetRole,

          question:
            currentQuestion,

          candidateAnswer,

          enableFollowUps:
            session.enableFollowUps,

          resumeContext:
            session.context.resumeContext,

          jobContext:
            session.context.jobContext,
        });

      newAnswer =
        interviewAnswerSchema.parse({
          questionId,

          answer:
            candidateAnswer,

          status:
            "answered",

          evaluation,

          submittedAt:
            new Date().toISOString(),
        });

      latestProvider =
        evaluation.provider;

      latestModel =
        evaluation.modelUsed;
    } else {
      // Skip question without AI evaluation

      newAnswer =
        interviewAnswerSchema.parse({
          questionId,

          answer: "",

          status:
            "skipped",

          evaluation: null,

          submittedAt:
            new Date().toISOString(),
        });
    }

    // =================================
    // UPDATE ANSWER HISTORY
    // =================================

    const updatedAnswers = [
      ...existingAnswers,
      newAnswer,
    ];

    const answeredQuestions =
      updatedAnswers.filter(
        (answer) =>
          answer.status === "answered"
      ).length;

    const skippedQuestions =
      updatedAnswers.filter(
        (answer) =>
          answer.status === "skipped"
      ).length;

    const progressPercentage =
      calculateInterviewProgress(
        session.questionCount,
        answeredQuestions,
        skippedQuestions
      );

    const averageScore =
      calculateAverageInterviewScore(
        updatedAnswers
      );

    // =================================
    // DETERMINE NEXT INTERVIEW ACTION
    // =================================

    const decision =
      determineNextInterviewAction({
        currentDifficulty:
          session.currentDifficulty,

        adaptiveDifficulty:
          session.adaptiveDifficulty,

        enableFollowUps:
          session.enableFollowUps,

        questionCount:
          session.questionCount,

        followUpCount:
          session.followUpCount,

        questions:
          existingQuestions,

        answers:
          updatedAnswers,
      });

    const updatedQuestions = [
      ...existingQuestions,
    ];

    let followUpCount =
      session.followUpCount;

    let currentQuestionIndex =
      session.currentQuestionIndex;

    let completedAt: Date | null =
      null;

    let status:
      | "in_progress"
      | "completed" =
      "in_progress";

    // =================================
    // COMPLETE INTERVIEW
    // =================================

    if (
      decision.shouldCompleteInterview
    ) {
      status = "completed";

      completedAt = new Date();

      currentQuestionIndex =
        updatedQuestions.length;
    } else {
      // =================================
      // GENERATE NEXT QUESTION
      // =================================

      const nextQuestion =
        await generateInterviewQuestion({
          interviewType:
            session.interviewType,

          targetRole:
            session.targetRole,

          companyName:
            session.companyName,

          difficulty:
            decision.nextDifficulty,

          questionNumber:
            existingQuestions.length + 1,

          totalQuestions:
            session.questionCount,

          topics:
            session.topics,

          resumeContext:
            session.context.resumeContext,

          jobContext:
            session.context.jobContext,

          identifiedSkillGaps:
            session.context.identifiedSkillGaps,

          previousQuestions:
            existingQuestions,

          previousAnswers:
            updatedAnswers,

          isFollowUp:
            decision.isFollowUp,

          parentQuestionId:
            decision.parentQuestionId,

          followUpFocus:
            decision.followUpFocus,
        });

      updatedQuestions.push(
        nextQuestion.question
      );

      currentQuestionIndex =
        updatedQuestions.length - 1;

      if (decision.isFollowUp) {
        followUpCount++;
      }

      latestProvider =
        nextQuestion.provider;

      latestModel =
        nextQuestion.modelUsed;
    }

    // =================================
    // ATOMIC SESSION UPDATE
    // =================================

    const updatedSession =
      await InterviewSession.findOneAndUpdate(
        {
          _id: sessionId,

          userId,

          status: "in_progress",

          isLocked: true,

          lockToken,
        },
        {
          $set: {
            questions:
              updatedQuestions,

            answers:
              updatedAnswers,

            currentDifficulty:
              decision.nextDifficulty,

            currentQuestionIndex,

            answeredQuestions,

            skippedQuestions,

            followUpCount,

            progressPercentage,

            averageScore,

            status,

            completedAt,

            provider:
              latestProvider,

            modelUsed:
              latestModel,

            isLocked: false,

            lockToken: null,

            lockedAt: null,
          },

          $inc: {
            __v: 1,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select("+questions +answers");

    if (!updatedSession) {
      throw new InterviewSessionError(
        "Interview session changed during processing",
        409
      );
    }

    // Record actual interview completion.

    if (updatedSession.status === "completed") {

      void recordSuccessfulActivity({

        userId,

        activityType:
          ACTIVITY_TYPES.INTERVIEW_COMPLETED,

      }).catch(() => {

        // Analytics must not interrupt
        // successful interview completion.

      });

    }

    console.log(
      "Interview question processed:",
      questionId,
      status
    );

    return {
      session:
        getPublicSession(
          updatedSession
        ),

      latestAnswer:
        newAnswer,

      adaptiveDecision:
        decision,
    };
  } finally {
    // Release only the lock acquired
    // by this particular operation.

    try {
      await releaseSessionLock(
        userId,
        sessionId,
        lockToken
      );
    } catch {
      console.error(
        "Unable to release interview session lock:",
        sessionId
      );
    }
  }
};

// =====================================
// SUBMIT INTERVIEW ANSWER
// =====================================

export const submitInterviewAnswer = async (
  userId: string,
  sessionId: string,
  request: unknown
) => {
  const validation =
    submitInterviewAnswerSchema.safeParse(
      request
    );

  if (!validation.success) {
    throw new InterviewSessionError(
      "Invalid interview answer request",
      400
    );
  }

  return processInterviewQuestion(
    userId,
    sessionId,
    validation.data.questionId,
    validation.data.answer
  );
};

// =====================================
// SKIP INTERVIEW QUESTION
// =====================================

export const skipInterviewQuestion = async (
  userId: string,
  sessionId: string,
  request: unknown
) => {
  const validation =
    skipInterviewQuestionSchema.safeParse(
      request
    );

  if (!validation.success) {
    throw new InterviewSessionError(
      "Invalid skip question request",
      400
    );
  }

  return processInterviewQuestion(
    userId,
    sessionId,
    validation.data.questionId,
    null
  );
};

// =====================================
// GET INTERVIEW SESSION BY ID
// =====================================

export const getInterviewSessionById = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(
    sessionId,
    "session ID"
  );

  const session =
    await InterviewSession.findOne({
      _id: sessionId,
      userId,
    }).select(
      "+questions +answers"
    );

  if (!session) {
    throw new InterviewSessionError(
      "Interview session not found",
      404
    );
  }

  return getPublicSession(session);
};

// =====================================
// GET INTERVIEW SESSION HISTORY
// =====================================

export const getInterviewSessions = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  validateId(userId, "user ID");

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new InterviewSessionError(
      "Invalid pagination parameters",
      400
    );
  }

  const skip =
    (page - 1) * limit;

  const [sessions, total] =
    await Promise.all([
      InterviewSession.find({
        userId,
      })
        .select(
          "_id interviewType targetRole companyName " +
          "initialDifficulty currentDifficulty " +
          "questionCount answeredQuestions skippedQuestions " +
          "followUpCount progressPercentage averageScore " +
          "status isLocked interviewVersion " +
          "startedAt completedAt createdAt updatedAt"
        )
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      InterviewSession.countDocuments({
        userId,
      }),
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
// CANCEL INTERVIEW SESSION
// =====================================

export const cancelInterviewSession = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(
    sessionId,
    "session ID"
  );

  const session =
    await InterviewSession.findOneAndUpdate(
      {
        _id: sessionId,

        userId,

        status: {
          $in: [
            "not_started",
            "in_progress",
          ],
        },

        isLocked: false,
      },
      {
        $set: {
          status: "cancelled",

          completedAt: new Date(),
        },

        $inc: {
          __v: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "+questions +answers"
    );

  if (!session) {
    const existing =
      await InterviewSession.exists({
        _id: sessionId,
        userId,
      });

    if (!existing) {
      throw new InterviewSessionError(
        "Interview session not found",
        404
      );
    }

    throw new InterviewSessionError(
      "Interview cannot be cancelled in its current state",
      409
    );
  }

  return getPublicSession(session);
};

// =====================================
// DELETE INTERVIEW SESSION
// =====================================

export const deleteInterviewSession = async (
  userId: string,
  sessionId: string
) => {
  validateId(userId, "user ID");

  validateId(
    sessionId,
    "session ID"
  );

  const result =
    await InterviewSession.deleteOne({
      _id: sessionId,

      userId,

      isLocked: false,
    });

  if (result.deletedCount === 0) {
    const existing =
      await InterviewSession.exists({
        _id: sessionId,
        userId,
      });

    if (!existing) {
      throw new InterviewSessionError(
        "Interview session not found",
        404
      );
    }

    throw new InterviewSessionError(
      "Cannot delete an interview while processing",
      409
    );
  }

  return {
    sessionId,
  };
};


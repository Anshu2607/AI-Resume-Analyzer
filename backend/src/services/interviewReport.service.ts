import { randomUUID } from "node:crypto";

import InterviewSession from "../models/interviewSession.model.js";

import {
  roundInterviewScore,
  getPerformanceLevel,
  INTERVIEW_CONFIG,
} from "../config/interview.config.js";

import {
  interviewReportSchema,
  interviewReportInsightsSchema,
} from "../validators/interview.validator.js";

import type {
  InterviewAnswer,
  InterviewQuestion,
  InterviewEvaluation,
  InterviewReport,
  InterviewReportInsights,
  TopicPerformance,
  EvaluationScores,
} from "../validators/interview.validator.js";

import {
  INTERVIEW_REPORT_SYSTEM_PROMPT,
  buildInterviewReportPrompt,
} from "../prompts/interviewReport.prompt.js";

import {
  calculateAverageInterviewScore,
} from "../utils/interviewAdaptive.utils.js";

import {
  generateLLMResponse,
} from "./llm.service.js";

// =====================================
// CUSTOM REPORT ERROR
// =====================================

export class InterviewReportError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "InterviewReportError";
  }
}

// =====================================
// RETRIEVE EVALUATED ANSWERS
// =====================================

const getEvaluations = (
  answers: InterviewAnswer[]
): InterviewEvaluation[] => {
  return answers.flatMap((answer) =>
    answer.status === "answered" &&
    answer.evaluation !== null
      ? [answer.evaluation]
      : []
  );
};

// =====================================
// CALCULATE AVERAGE DIMENSION SCORE
// =====================================

const calculateDimensionAverage = (
  evaluations: InterviewEvaluation[],
  dimension: keyof EvaluationScores
): number | null => {
  if (evaluations.length === 0) {
    return null;
  }

  const total = evaluations.reduce(
    (sum, evaluation) =>
      sum + evaluation.scores[dimension],
    0
  );

  return roundInterviewScore(
    total / evaluations.length
  );
};

// =====================================
// CALCULATE TOPIC-WISE PERFORMANCE
// =====================================

export const calculateTopicPerformance = (
  questions: InterviewQuestion[],
  answers: InterviewAnswer[]
): TopicPerformance[] => {
  const answerMap = new Map(
    answers.map((answer) => [
      answer.questionId,
      answer,
    ])
  );

  const topicMap = new Map<
    string,
    {
      topic: string;
      totalQuestions: number;
      answeredQuestions: number;
      scores: number[];
    }
  >();

  for (const question of questions) {
    const topic =
      question.topic.trim() || "General";

    const normalizedTopic = topic
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ");

    const entry =
      topicMap.get(normalizedTopic) || {
        topic,
        totalQuestions: 0,
        answeredQuestions: 0,
        scores: [],
      };

    entry.totalQuestions++;

    const answer =
      answerMap.get(question.questionId);

    if (
      answer?.status === "answered" &&
      answer.evaluation
    ) {
      entry.answeredQuestions++;

      entry.scores.push(
        answer.evaluation.overallScore
      );
    }

    topicMap.set(
      normalizedTopic,
      entry
    );
  }

  return Array.from(
    topicMap.values()
  )
    .map((item) => ({
      topic: item.topic,

      totalQuestions:
        item.totalQuestions,

      answeredQuestions:
        item.answeredQuestions,

      averageScore:
        item.scores.length > 0
          ? roundInterviewScore(
              item.scores.reduce(
                (sum, score) =>
                  sum + score,
                0
              ) / item.scores.length
            )
          : null,
    }))
    .sort((first, second) => {
      if (
        first.averageScore === null &&
        second.averageScore === null
      ) {
        return 0;
      }

      if (first.averageScore === null) {
        return 1;
      }

      if (second.averageScore === null) {
        return -1;
      }

      return (
        first.averageScore -
        second.averageScore
      );
    });
};

// =====================================
// DETERMINISTIC INTERVIEW STATISTICS
// =====================================

export const calculateInterviewStatistics = (
  questions: InterviewQuestion[],
  answers: InterviewAnswer[]
) => {
  const evaluations =
    getEvaluations(answers);

  const overallScore =
    calculateAverageInterviewScore(
      answers
    );

  return {
    totalQuestions:
      questions.length,

    answeredQuestions:
      evaluations.length,

    skippedQuestions:
      answers.filter(
        (answer) =>
          answer.status === "skipped"
      ).length,

    overallScore,

    averageAccuracy:
      calculateDimensionAverage(
        evaluations,
        "accuracy"
      ),

    averageRelevance:
      calculateDimensionAverage(
        evaluations,
        "relevance"
      ),

    averageCompleteness:
      calculateDimensionAverage(
        evaluations,
        "completeness"
      ),

    averageClarity:
      calculateDimensionAverage(
        evaluations,
        "clarity"
      ),

    performanceLevel:
      getPerformanceLevel(
        overallScore
      ),

    topicPerformance:
      calculateTopicPerformance(
        questions,
        answers
      ),
  };
};

// =====================================
// REMOVE DUPLICATE FEEDBACK
// =====================================

const uniqueFeedback = (
  values: string[],
  maxItems = 10
): string[] => {
  const seen = new Set<string>();

  const result: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();

    const key = cleaned
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (!cleaned || seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(cleaned);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
};

// =====================================
// FALLBACK REPORT INSIGHTS
// =====================================

// Used when the AI provider is unavailable
// or returns an invalid report.

const buildFallbackInsights = (
  answers: InterviewAnswer[],
  statistics: ReturnType<
    typeof calculateInterviewStatistics
  >
): InterviewReportInsights => {
  const evaluations =
    getEvaluations(answers);

  // All questions were skipped

  if (evaluations.length === 0) {
    return {
      summary:
        "The interview was completed without any evaluated answers. There is insufficient evidence to assess interview performance.",

      strengths: [],

      weaknesses: [],

      priorityTopics: [],

      recommendations: [
        "Attempt the interview again and provide answers to assess your understanding.",

        "Review foundational concepts related to your target role before starting another interview.",
      ],
    };
  }

  const strengths = uniqueFeedback(
    evaluations.flatMap(
      (evaluation) =>
        evaluation.strengths
    )
  );

  const weaknesses = uniqueFeedback(
    evaluations.flatMap(
      (evaluation) =>
        evaluation.weaknesses
    )
  );

  const priorityTopics = uniqueFeedback(
    statistics.topicPerformance
      .filter(
        (topic) =>
          topic.averageScore !== null &&
          topic.averageScore < 75
      )
      .map((topic) => topic.topic)
  );

  const recommendations = uniqueFeedback(
    evaluations.flatMap(
      (evaluation) =>
        evaluation.improvementSuggestions
    )
  );

  return {
    summary:
      `You answered ${statistics.answeredQuestions} ` +
      `of ${statistics.totalQuestions} questions ` +
      `with an average evaluated-answer score of ` +
      `${statistics.overallScore}/100. ` +
      `This summary uses saved individual evaluations ` +
      `because AI report synthesis was unavailable.`,

    strengths,

    weaknesses,

    priorityTopics,

    recommendations:
      recommendations.length > 0
        ? recommendations
        : [
            "Review your individual answer feedback and model answers before attempting another interview.",
          ],
  };
};

// =====================================
// GENERATE AI REPORT INSIGHTS
// =====================================

const generateReportInsights = async (
  prompt: string
): Promise<InterviewReportInsights | null> => {
  let correction = "";

  for (
    let attempt = 1;
    attempt <=
      INTERVIEW_CONFIG.maxGenerationAttempts;
    attempt++
  ) {
    try {
      const response =
        await generateLLMResponse({
          systemPrompt:
            INTERVIEW_REPORT_SYSTEM_PROMPT,

          userPrompt:
            prompt + correction,
        });

      const cleaned = response.content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed: unknown =
        JSON.parse(cleaned);

      const validation =
        interviewReportInsightsSchema.safeParse(
          parsed
        );

      if (validation.success) {
        return validation.data;
      }

      correction = `

CORRECTION REQUIRED:

The previous report failed schema validation.

Return the required summary, strengths, weaknesses,
priorityTopics and recommendations fields.

Respect the required field types and length limits.

Return valid JSON only.
`;

    } catch {
      console.warn(
        `Interview report generation attempt ${attempt} failed`
      );

      correction = `

CORRECTION REQUIRED:

Return exactly one complete valid JSON object
matching the required report structure.
`;
    }
  }

  return null;
};

// =====================================
// GENERATE AND SAVE INTERVIEW REPORT
// =====================================

export const generateInterviewReport = async (
  userId: string,
  sessionId: string
): Promise<InterviewReport> => {
  const idPattern = /^[a-fA-F0-9]{24}$/;

  if (
    !idPattern.test(userId) ||
    !idPattern.test(sessionId)
  ) {
    throw new InterviewReportError(
      "Invalid interview session identifier",
      400
    );
  }

  // Return the existing report when available.

  const existing =
    await InterviewSession.findOne({
      _id: sessionId,
      userId,
    }).lean();

  if (!existing) {
    throw new InterviewReportError(
      "Interview session not found",
      404
    );
  }

  if (existing.status !== "completed") {
    throw new InterviewReportError(
      "Complete the interview before generating a report",
      409
    );
  }

  if (existing.report) {
    return interviewReportSchema.parse(
      existing.report
    );
  }

  if (!existing.consent) {
    throw new InterviewReportError(
      "External AI processing consent is required",
      403
    );
  }

  // Acquire lock to prevent simultaneous
  // report generation requests.

  const lockToken = randomUUID();

  const session =
    await InterviewSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId,

        status: "completed",

        consent: true,

        isLocked: false,

        report: null,
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
    ).select("+questions +answers");

  if (!session) {
    // Another request may have completed
    // report generation in the meantime.

    const latest =
      await InterviewSession.findOne({
        _id: sessionId,
        userId,
      }).lean();

    if (latest?.report) {
      return interviewReportSchema.parse(
        latest.report
      );
    }

    throw new InterviewReportError(
      "Interview report cannot be generated in its current state",
      409
    );
  }

  try {
    const questions =
      session.questions;

    const answers =
      session.answers;

    // Validate completed interview history.

    const questionIds = new Set(
      questions.map(
        (question) => question.questionId
      )
    );

    const answerIds = new Set(
      answers.map(
        (answer) => answer.questionId
      )
    );

    if (
      questions.length !==
        session.questionCount ||

      answers.length !==
        questions.length ||

      questionIds.size !==
        questions.length ||

      answerIds.size !==
        answers.length ||

      answers.some(
        (answer) =>
          !questionIds.has(answer.questionId)
      ) ||

      answers.some(
        (answer) =>
          answer.status === "answered" &&
          !answer.evaluation
      )
    ) {
      throw new InterviewReportError(
        "Interview history is incomplete or inconsistent",
        409
      );
    }

    // Calculate backend-controlled statistics.

    const statistics =
      calculateInterviewStatistics(
        questions,
        answers
      );

    // Prepare deterministic fallback first.

    let insights =
      buildFallbackInsights(
        answers,
        statistics
      );

    // Do not call external AI when
    // no answers have been evaluated.

    if (statistics.answeredQuestions > 0) {
      const prompt =
        buildInterviewReportPrompt({
          targetRole:
            session.targetRole,

          interviewType:
            session.interviewType,

          questions,

          answers,

          overallScore:
            statistics.overallScore,

          performanceLevel:
            statistics.performanceLevel,

          topicPerformance:
            statistics.topicPerformance,

          answeredQuestions:
            statistics.answeredQuestions,

          skippedQuestions:
            statistics.skippedQuestions,
        });

      const aiInsights =
        await generateReportInsights(
          prompt
        );

      if (aiInsights) {
        insights = aiInsights;
      }
    }

    // Merge AI feedback with deterministic
    // statistics and validate final report.

    const report =
      interviewReportSchema.parse({
        ...insights,

        ...statistics,

        generatedAt:
          new Date().toISOString(),
      });

    // Persist report and release lock
    // within the same atomic operation.

    const updated =
      await InterviewSession.findOneAndUpdate(
        {
          _id: sessionId,
          userId,

          status: "completed",

          report: null,

          isLocked: true,

          lockToken,
        },
        {
          $set: {
            report,

            averageScore:
              report.overallScore,

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
      );

    if (!updated) {
      throw new InterviewReportError(
        "Interview session changed during report generation",
        409
      );
    }

    console.log(
      "Interview performance report saved:",
      sessionId
    );

    return report;

  } finally {
    // Release only this operation's lock
    // if report generation failed.

    try {
      await InterviewSession.updateOne(
        {
          _id: sessionId,

          userId,

          isLocked: true,

          lockToken,
        },
        {
          $set: {
            isLocked: false,

            lockToken: null,

            lockedAt: null,
          },
        }
      );
    } catch {
      console.error(
        "Failed to release interview report lock:",
        sessionId
      );
    }
  }
};

// =====================================
// RETRIEVE EXISTING INTERVIEW REPORT
// =====================================

export const getInterviewReport = async (
  userId: string,
  sessionId: string
): Promise<InterviewReport> => {
  const idPattern = /^[a-fA-F0-9]{24}$/;

  if (
    !idPattern.test(userId) ||
    !idPattern.test(sessionId)
  ) {
    throw new InterviewReportError(
      "Invalid interview session identifier",
      400
    );
  }

  const session =
    await InterviewSession.findOne({
      _id: sessionId,
      userId,
    })
      .select("report status")
      .lean();

  if (!session) {
    throw new InterviewReportError(
      "Interview session not found",
      404
    );
  }

  if (!session.report) {
    throw new InterviewReportError(
      "Interview report has not been generated",
      404
    );
  }

  return interviewReportSchema.parse(
    session.report
  );
};
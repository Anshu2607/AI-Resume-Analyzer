import {
  INTERVIEW_CONFIG,
  increaseDifficulty,
  decreaseDifficulty,
  roundInterviewScore,
} from "../config/interview.config.js";

import type {
  InterviewDifficulty,
  InterviewQuestion,
  InterviewAnswer,
} from "../validators/interview.validator.js";

// =====================================
// ADAPTIVE ENGINE VERSION
// =====================================

export const ADAPTIVE_ENGINE_VERSION = "1.0.0";

// =====================================
// ADAPTIVE ENGINE INPUT
// =====================================

export interface AdaptiveEngineInput {
  currentDifficulty: InterviewDifficulty;

  adaptiveDifficulty: boolean;

  enableFollowUps: boolean;

  questionCount: number;

  followUpCount: number;

  questions: InterviewQuestion[];

  answers: InterviewAnswer[];
}

// =====================================
// ADAPTIVE DECISION
// =====================================

export interface AdaptiveDecision {
  shouldCompleteInterview: boolean;

  nextDifficulty: InterviewDifficulty;

  difficultyChanged: boolean;

  difficultyReason: string;

  recentAverageScore: number | null;

  isFollowUp: boolean;

  parentQuestionId: string | null;

  followUpFocus: string | null;
}

// =====================================
// GET RECENT EVALUATED ANSWERS
// =====================================

const getRecentEvaluatedAnswers = (
  answers: InterviewAnswer[]
): InterviewAnswer[] => {
  return answers
    .filter(
      (answer) =>
        answer.status === "answered" &&
        answer.evaluation !== null
    )
    .slice(
      -INTERVIEW_CONFIG.difficultyEvaluationWindow
    );
};

// =====================================
// CALCULATE RECENT AVERAGE SCORE
// =====================================

export const calculateRecentAverageScore = (
  answers: InterviewAnswer[]
): number | null => {
  const evaluatedAnswers =
    getRecentEvaluatedAnswers(answers);

  if (evaluatedAnswers.length === 0) {
    return null;
  }

  const totalScore = evaluatedAnswers.reduce(
    (sum, answer) =>
      sum + answer.evaluation!.overallScore,
    0
  );

  return roundInterviewScore(
    totalScore / evaluatedAnswers.length
  );
};

// =====================================
// DETERMINE NEXT DIFFICULTY
// =====================================

export const determineNextDifficulty = (
  input: AdaptiveEngineInput
): {
  difficulty: InterviewDifficulty;
  changed: boolean;
  reason: string;
  recentAverageScore: number | null;
} => {
  const recentAverageScore =
    calculateRecentAverageScore(input.answers);

  const unchanged = (reason: string) => ({
    difficulty: input.currentDifficulty,
    changed: false,
    reason,
    recentAverageScore,
  });

  if (!input.adaptiveDifficulty) {
    return unchanged(
      "Adaptive difficulty is disabled."
    );
  }

  const latestAnswer =
    input.answers[input.answers.length - 1];

  if (
    !latestAnswer ||
    latestAnswer.status === "skipped" ||
    !latestAnswer.evaluation
  ) {
    return unchanged(
      "No new evaluated answer is available."
    );
  }

  const evaluatedAnswers =
    getRecentEvaluatedAnswers(input.answers);

  if (
    evaluatedAnswers.length <
    INTERVIEW_CONFIG.difficultyEvaluationWindow
  ) {
    return unchanged(
      "More evaluated answers are required."
    );
  }

  // Require recent answers to belong to the
  // current difficulty before changing levels.

  const sameDifficulty = evaluatedAnswers.every(
    (answer) =>
      input.questions.find(
        (question) =>
          question.questionId === answer.questionId
      )?.difficulty === input.currentDifficulty
  );

  if (!sameDifficulty) {
    return unchanged(
      "Collecting performance evidence at the current difficulty."
    );
  }

  if (recentAverageScore === null) {
    return unchanged(
      "Insufficient performance evidence."
    );
  }

  // Increase difficulty

  if (
    recentAverageScore >=
    INTERVIEW_CONFIG.increaseDifficultyThreshold
  ) {
    const difficulty = increaseDifficulty(
      input.currentDifficulty
    );

    return {
      difficulty,

      changed:
        difficulty !== input.currentDifficulty,

      reason:
        difficulty !== input.currentDifficulty
          ? "Strong recent performance. Difficulty increased."
          : "The interview is already at the highest difficulty.",

      recentAverageScore,
    };
  }

  // Decrease difficulty

  if (
    recentAverageScore <=
    INTERVIEW_CONFIG.decreaseDifficultyThreshold
  ) {
    const difficulty = decreaseDifficulty(
      input.currentDifficulty
    );

    return {
      difficulty,

      changed:
        difficulty !== input.currentDifficulty,

      reason:
        difficulty !== input.currentDifficulty
          ? "Recent answers indicate knowledge gaps. Difficulty decreased."
          : "The interview is already at the lowest difficulty.",

      recentAverageScore,
    };
  }

  return unchanged(
    "Recent performance supports maintaining the current difficulty."
  );
};

// =====================================
// COUNT CONSECUTIVE FOLLOW-UPS
// =====================================

const countConsecutiveFollowUps = (
  questions: InterviewQuestion[]
): number => {
  let count = 0;

  for (
    let index = questions.length - 1;
    index >= 0;
    index--
  ) {
    if (!questions[index]?.isFollowUp) {
      break;
    }

    count++;
  }

  return count;
};

// =====================================
// DETERMINE FOLLOW-UP ELIGIBILITY
// =====================================

export const determineFollowUp = (
  input: AdaptiveEngineInput
): {
  isFollowUp: boolean;
  parentQuestionId: string | null;
  followUpFocus: string | null;
} => {
  const noFollowUp = {
    isFollowUp: false,
    parentQuestionId: null,
    followUpFocus: null,
  };

  // Follow-ups must be enabled.

  if (!input.enableFollowUps) {
    return noFollowUp;
  }

  // Follow-ups count toward the total
  // configured interview question limit.

  if (
    input.questions.length >= input.questionCount
  ) {
    return noFollowUp;
  }

  // Enforce maximum follow-up count.

  const actualFollowUpCount =
    input.questions.filter(
      (question) => question.isFollowUp
    ).length;

  if (
    Math.max(
      actualFollowUpCount,
      input.followUpCount
    ) >= INTERVIEW_CONFIG.maxFollowUps
  ) {
    return noFollowUp;
  }

  // Prevent repeated consecutive follow-ups.

  if (
    countConsecutiveFollowUps(input.questions) >=
    INTERVIEW_CONFIG.maxConsecutiveFollowUps
  ) {
    return noFollowUp;
  }

  const latestQuestion =
    input.questions[input.questions.length - 1];

  const latestAnswer =
    input.answers[input.answers.length - 1];

  if (
    !latestQuestion ||
    !latestAnswer ||
    latestAnswer.questionId !==
      latestQuestion.questionId ||
    latestAnswer.status !== "answered" ||
    !latestAnswer.evaluation
  ) {
    return noFollowUp;
  }

  const evaluation = latestAnswer.evaluation;

  // The evaluator must recommend a meaningful
  // follow-up with a specific focus.

  if (
    !evaluation.recommendFollowUp ||
    !evaluation.followUpFocus?.trim()
  ) {
    return noFollowUp;
  }

  // Follow-ups target partial understanding.

  if (
    evaluation.overallScore <
      INTERVIEW_CONFIG.followUpMinScore ||
    evaluation.overallScore >
      INTERVIEW_CONFIG.followUpMaxScore
  ) {
    return noFollowUp;
  }

  return {
    isFollowUp: true,

    parentQuestionId:
      latestQuestion.questionId,

    followUpFocus:
      evaluation.followUpFocus.trim().slice(0, 500),
  };
};

// =====================================
// NORMALIZE QUESTION TEXT
// =====================================

const normalizeQuestion = (
  question: string
): string => {
  return question
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// =====================================
// CALCULATE QUESTION SIMILARITY
// =====================================

export const calculateQuestionSimilarity = (
  firstQuestion: string,
  secondQuestion: string
): number => {
  const firstTokens = new Set(
    normalizeQuestion(firstQuestion)
      .split(" ")
      .filter(Boolean)
  );

  const secondTokens = new Set(
    normalizeQuestion(secondQuestion)
      .split(" ")
      .filter(Boolean)
  );

  if (
    firstTokens.size === 0 ||
    secondTokens.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const token of firstTokens) {
    if (secondTokens.has(token)) {
      intersection++;
    }
  }

  const union = new Set([
    ...firstTokens,
    ...secondTokens,
  ]).size;

  return intersection / union;
};

// =====================================
// DETECT DUPLICATE QUESTIONS
// =====================================

export const isDuplicateInterviewQuestion = (
  candidateQuestion: string,
  previousQuestions: InterviewQuestion[]
): boolean => {
  const normalizedCandidate =
    normalizeQuestion(candidateQuestion);

  return previousQuestions.some(
    (previousQuestion) => {
      const normalizedPrevious =
        normalizeQuestion(
          previousQuestion.question
        );

      // Exact normalized duplicate

      if (
        normalizedCandidate === normalizedPrevious
      ) {
        return true;
      }

      // High lexical similarity

      const similarity =
        calculateQuestionSimilarity(
          candidateQuestion,
          previousQuestion.question
        );

      return similarity >= 0.85;
    }
  );
};

// =====================================
// CALCULATE INTERVIEW PROGRESS
// =====================================

export const calculateInterviewProgress = (
  questionCount: number,
  answeredQuestions: number,
  skippedQuestions: number
): number => {
  if (
    !Number.isInteger(questionCount) ||
    questionCount < 1
  ) {
    throw new RangeError(
      "Invalid interview question count"
    );
  }

  if (
    !Number.isInteger(answeredQuestions) ||
    !Number.isInteger(skippedQuestions) ||
    answeredQuestions < 0 ||
    skippedQuestions < 0
  ) {
    throw new RangeError(
      "Invalid interview progress values"
    );
  }

  const processedQuestions =
    answeredQuestions + skippedQuestions;

  if (processedQuestions > questionCount) {
    throw new RangeError(
      "Processed questions exceed interview question count"
    );
  }

  if (processedQuestions === questionCount) {
    return 100;
  }

  return Math.min(
    99,
    Math.round(
      (processedQuestions / questionCount) * 100
    )
  );
};

// =====================================
// CALCULATE OVERALL AVERAGE SCORE
// =====================================

export const calculateAverageInterviewScore = (
  answers: InterviewAnswer[]
): number | null => {
  const evaluatedAnswers = answers.filter(
    (answer) =>
      answer.status === "answered" &&
      answer.evaluation !== null
  );

  if (evaluatedAnswers.length === 0) {
    return null;
  }

  const totalScore = evaluatedAnswers.reduce(
    (sum, answer) =>
      sum + answer.evaluation!.overallScore,
    0
  );

  return roundInterviewScore(
    totalScore / evaluatedAnswers.length
  );
};

// =====================================
// MAIN ADAPTIVE DECISION ENGINE
// =====================================

export const determineNextInterviewAction = (
  input: AdaptiveEngineInput
): AdaptiveDecision => {
  const processedQuestions = new Set(
    input.answers.map(
      (answer) => answer.questionId
    )
  ).size;

  // Complete the interview when every
  // configured question has been processed.

  if (
    processedQuestions >= input.questionCount
  ) {
    return {
      shouldCompleteInterview: true,

      nextDifficulty:
        input.currentDifficulty,

      difficultyChanged: false,

      difficultyReason:
        "All configured interview questions have been processed.",

      recentAverageScore:
        calculateRecentAverageScore(
          input.answers
        ),

      isFollowUp: false,

      parentQuestionId: null,

      followUpFocus: null,
    };
  }

  const followUpDecision =
    determineFollowUp(input);

  // Keep the current difficulty for a follow-up.
  // This ensures continuity with its parent question.

  if (followUpDecision.isFollowUp) {
    return {
      shouldCompleteInterview: false,

      nextDifficulty:
        input.currentDifficulty,

      difficultyChanged: false,

      difficultyReason:
        "Maintaining difficulty for a targeted follow-up question.",

      recentAverageScore:
        calculateRecentAverageScore(
          input.answers
        ),

      ...followUpDecision,
    };
  }

  const difficultyDecision =
    determineNextDifficulty(input);

  return {
    shouldCompleteInterview: false,

    nextDifficulty:
      difficultyDecision.difficulty,

    difficultyChanged:
      difficultyDecision.changed,

    difficultyReason:
      difficultyDecision.reason,

    recentAverageScore:
      difficultyDecision.recentAverageScore,

    isFollowUp: false,

    parentQuestionId: null,

    followUpFocus: null,
  };
};
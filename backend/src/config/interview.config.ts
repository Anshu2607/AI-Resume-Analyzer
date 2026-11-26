import type {
  InterviewDifficulty,
  EvaluationScores,
  PerformanceLevel,
} from "../validators/interview.validator.js";

// =====================================
// INTERVIEW ENGINE VERSION
// =====================================

export const INTERVIEW_VERSION = "1.0.0";

// =====================================
// INTERVIEW CONFIGURATION
// =====================================

export const INTERVIEW_CONFIG = {
  minQuestions: 3,

  maxQuestions: 15,

  defaultQuestions: 5,

  maxFollowUps: 3,

  maxConsecutiveFollowUps: 1,

  maxGenerationAttempts: 2,

  maxEvaluationAttempts: 2,

  maxAnswerCharacters: 10000,

  maxResumeContextCharacters: 6000,

  maxJobContextCharacters: 6000,

  maxPreviousContextCharacters: 12000,

  increaseDifficultyThreshold: 80,

  decreaseDifficultyThreshold: 45,

  followUpMinScore: 40,

  followUpMaxScore: 79,

  difficultyEvaluationWindow: 2,
} as const;

// =====================================
// SCORING WEIGHTS
// =====================================

export const INTERVIEW_SCORE_WEIGHTS = {
  accuracy: 0.35,

  relevance: 0.25,

  completeness: 0.25,

  clarity: 0.15,
} as const;

// =====================================
// PERFORMANCE THRESHOLDS
// =====================================

export const PERFORMANCE_THRESHOLDS = {
  excellent: 90,

  good: 75,

  average: 60,

  needsImprovement: 40,
} as const;

// =====================================
// DIFFICULTY LEVELS
// =====================================

export const DIFFICULTY_LEVELS:
  readonly InterviewDifficulty[] = [
    "beginner",
    "intermediate",
    "advanced",
  ];

// =====================================
// ROUND SCORE
// =====================================

export const roundInterviewScore = (
  value: number
): number => {
  return Math.round(value * 100) / 100;
};

// =====================================
// CALCULATE WEIGHTED SCORE
// =====================================

export const calculateInterviewScore = (
  scores: EvaluationScores
): number => {
  const dimensions = [
    scores.accuracy,
    scores.relevance,
    scores.completeness,
    scores.clarity,
  ];

  if (
    dimensions.some(
      (score) =>
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
    )
  ) {
    throw new RangeError(
      "Evaluation scores must be between 0 and 100"
    );
  }

  const weightedScore =
    scores.accuracy *
      INTERVIEW_SCORE_WEIGHTS.accuracy +

    scores.relevance *
      INTERVIEW_SCORE_WEIGHTS.relevance +

    scores.completeness *
      INTERVIEW_SCORE_WEIGHTS.completeness +

    scores.clarity *
      INTERVIEW_SCORE_WEIGHTS.clarity;

  return roundInterviewScore(
    Math.max(
      0,
      Math.min(100, weightedScore)
    )
  );
};

// =====================================
// GET PERFORMANCE LEVEL
// =====================================

export const getPerformanceLevel = (
  score: number | null
): PerformanceLevel => {
  if (score === null) {
    return "not_assessed";
  }

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    throw new RangeError(
      "Invalid interview performance score"
    );
  }

  if (
    score >= PERFORMANCE_THRESHOLDS.excellent
  ) {
    return "excellent";
  }

  if (
    score >= PERFORMANCE_THRESHOLDS.good
  ) {
    return "good";
  }

  if (
    score >= PERFORMANCE_THRESHOLDS.average
  ) {
    return "average";
  }

  if (
    score >= PERFORMANCE_THRESHOLDS.needsImprovement
  ) {
    return "needs_improvement";
  }

  return "poor";
};

// =====================================
// INCREASE DIFFICULTY
// =====================================

export const increaseDifficulty = (
  currentDifficulty: InterviewDifficulty
): InterviewDifficulty => {
  const currentIndex =
    DIFFICULTY_LEVELS.indexOf(
      currentDifficulty
    );

  const nextIndex = Math.min(
    currentIndex + 1,
    DIFFICULTY_LEVELS.length - 1
  );

  return DIFFICULTY_LEVELS[nextIndex]!;
};

// =====================================
// DECREASE DIFFICULTY
// =====================================

export const decreaseDifficulty = (
  currentDifficulty: InterviewDifficulty
): InterviewDifficulty => {
  const currentIndex =
    DIFFICULTY_LEVELS.indexOf(
      currentDifficulty
    );

  const nextIndex = Math.max(
    currentIndex - 1,
    0
  );

  return DIFFICULTY_LEVELS[nextIndex]!;
};
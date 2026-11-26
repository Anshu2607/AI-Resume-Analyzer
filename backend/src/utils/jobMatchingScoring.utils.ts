import type {
  JobMatchingResponse,
} from "../validators/jobMatching.validator.js";

export const JOB_SCORING_VERSION = "1.0.0";

// Hybrid scoring weights
export const JOB_MATCHING_WEIGHTS = {
  semanticSimilarity: 0.30,
  technicalSkills: 0.30,
  experience: 0.20,
  education: 0.10,
  projectRelevance: 0.10,
} as const;

const normalizeScore = (
  score: number
): number => {

  if (!Number.isFinite(score)) {
    throw new Error(
      "Invalid compatibility score"
    );
  }

  return Math.max(
    0,
    Math.min(100, score)
  );
};

// Determine compatibility category
export const getCompatibilityLevel = (
  score: number
): string => {

  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "good";
  }

  if (score >= 50) {
    return "moderate";
  }

  if (score >= 25) {
    return "limited";
  }

  return "low";
};

// Calculate final hybrid compatibility score
export const calculateJobCompatibility = (
  semanticScore: number,
  analysis: JobMatchingResponse
) => {

  const scores = {
    semanticSimilarity:
      normalizeScore(semanticScore),

    technicalSkills:
      normalizeScore(
        analysis.assessment.technicalSkills.score
      ),

    experience:
      normalizeScore(
        analysis.assessment.experience.score
      ),

    education:
      normalizeScore(
        analysis.assessment.education.score
      ),

    projectRelevance:
      normalizeScore(
        analysis.assessment.projectRelevance.score
      ),
  };

  const weightedScores = {
    semanticSimilarity:
      scores.semanticSimilarity *
      JOB_MATCHING_WEIGHTS.semanticSimilarity,

    technicalSkills:
      scores.technicalSkills *
      JOB_MATCHING_WEIGHTS.technicalSkills,

    experience:
      scores.experience *
      JOB_MATCHING_WEIGHTS.experience,

    education:
      scores.education *
      JOB_MATCHING_WEIGHTS.education,

    projectRelevance:
      scores.projectRelevance *
      JOB_MATCHING_WEIGHTS.projectRelevance,
  };

  const overallScore = Math.round(
    Object.values(weightedScores).reduce(
      (total, score) => total + score,
      0
    )
  );

  return {
    overallScore,

    compatibilityLevel:
      getCompatibilityLevel(overallScore),

    scores,

    weightedScores,

    weights: JOB_MATCHING_WEIGHTS,

    scoringVersion: JOB_SCORING_VERSION,
  };
};
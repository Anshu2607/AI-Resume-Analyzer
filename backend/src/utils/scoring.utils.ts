import type {
  AnalysisResult,
} from "../validators/analysis.validator.js";

export const SCORING_VERSION = "1.0.0";

export const SCORING_WEIGHTS = {
  technicalSkills: 0.25,
  experience: 0.20,
  projects: 0.20,
  education: 0.10,
  resumeStructure: 0.15,
  achievements: 0.10,
} as const;

export const calculateOverallScore = (
  assessment: AnalysisResult["assessment"]
): number => {

  const weightedScore =
    assessment.technicalSkills.score *
      SCORING_WEIGHTS.technicalSkills +

    assessment.experience.score *
      SCORING_WEIGHTS.experience +

    assessment.projects.score *
      SCORING_WEIGHTS.projects +

    assessment.education.score *
      SCORING_WEIGHTS.education +

    assessment.resumeStructure.score *
      SCORING_WEIGHTS.resumeStructure +

    assessment.achievements.score *
      SCORING_WEIGHTS.achievements;

  return Math.max(
    0,
    Math.min(100, Math.round(weightedScore))
  );
};
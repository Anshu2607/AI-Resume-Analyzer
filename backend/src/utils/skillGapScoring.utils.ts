import type {
  JobMatchingResponse,
} from "../validators/jobMatching.validator.js";

import type {
  SkillGapItem,
  SkillGapPriority,
  SkillGapStatistics,
  SkillImportance,
} from "../validators/skillGap.validator.js";

// =====================================
// SCORING CONFIGURATION
// =====================================

export const SKILL_GAP_ANALYSIS_VERSION =
  "1.0.0";

export const SKILL_GAP_WEIGHTS = {

  requiredBaseScore: 70,

  preferredBaseScore: 30,

  technicalDeficitWeight: 30,

} as const;

// =====================================
// NORMALIZE SKILL NAMES
// =====================================

const normalizeSkill = (
  skill: string
): string => {

  return skill
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

};

// =====================================
// REMOVE DUPLICATE SKILLS
// =====================================

const uniqueSkills = (
  skills: string[]
): string[] => {

  const unique = new Map<string, string>();

  for (const skill of skills) {

    const normalized =
      normalizeSkill(skill);

    if (
      normalized &&
      !unique.has(normalized)
    ) {

      unique.set(
        normalized,
        skill.trim()
      );

    }
  }

  return Array.from(
    unique.values()
  );
};

// =====================================
// VALIDATE AND BOUND SCORES
// =====================================

const clampScore = (
  score: number
): number => {

  if (!Number.isFinite(score)) {

    throw new Error(
      "Invalid skill assessment score"
    );

  }

  return Math.max(
    0,
    Math.min(100, score)
  );
};

// =====================================
// DETERMINE PRIORITY LEVEL
// =====================================

export const getSkillGapPriority = (
  score: number
): SkillGapPriority => {

  const safeScore =
    clampScore(score);

  if (safeScore >= 85) {
    return "critical";
  }

  if (safeScore >= 70) {
    return "high";
  }

  if (safeScore >= 40) {
    return "medium";
  }

  return "low";
};

// =====================================
// CALCULATE INDIVIDUAL PRIORITY SCORE
// =====================================

export const calculateSkillPriorityScore = (

  importance: SkillImportance,

  technicalScore: number

): number => {

  const safeTechnicalScore =
    clampScore(technicalScore);

  const baseScore =
    importance === "required"

      ? SKILL_GAP_WEIGHTS.requiredBaseScore

      : SKILL_GAP_WEIGHTS.preferredBaseScore;

  const technicalDeficit =
    1 - safeTechnicalScore / 100;

  const priorityScore =
    baseScore +
    technicalDeficit *
      SKILL_GAP_WEIGHTS.technicalDeficitWeight;

  return Math.round(
    clampScore(priorityScore)
  );
};

// =====================================
// BUILD PRIORITIZED SKILL GAPS
// =====================================

export const prioritizeSkillGaps = (
  analysis: JobMatchingResponse
): SkillGapItem[] => {

  const technicalScore =
    analysis.assessment.technicalSkills.score;

  const requiredSkills = new Set(

    analysis.requiredSkills.map(
      normalizeSkill
    )

  );

  const matchedSkills = new Set(

    analysis.matchedSkills.map(
      (item) =>
        normalizeSkill(item.skill)
    )

  );

  const uniqueGaps =
    new Map<string, SkillGapItem>();

  for (
    const missingSkill of analysis.missingSkills
  ) {

    const normalized =
      normalizeSkill(
        missingSkill.skill
      );

    if (!normalized) {
      continue;
    }

    // Do not classify a skill as missing
    // if the existing report identifies
    // the same skill as matched.

    if (matchedSkills.has(normalized)) {
      continue;
    }

    // Required skills take precedence
    // over preferred skills.

    const importance: SkillImportance =

      requiredSkills.has(normalized) ||
      missingSkill.importance === "required"

        ? "required"

        : "preferred";

    const priorityScore =
      calculateSkillPriorityScore(

        importance,

        technicalScore

      );

    const item: SkillGapItem = {

      skill:
        missingSkill.skill.trim(),

      importance,

      priority:
        getSkillGapPriority(
          priorityScore
        ),

      priorityScore,

      evidenceStatus:
        "not_evidenced",

      recommendation:
        missingSkill.recommendation.trim(),

    };

    const existing =
      uniqueGaps.get(normalized);

    // Retain the higher-priority entry
    // when duplicate skills exist.

    if (
      !existing ||
      item.priorityScore >
        existing.priorityScore
    ) {

      uniqueGaps.set(
        normalized,
        item
      );

    }
  }

  return Array.from(
    uniqueGaps.values()
  ).sort((a, b) => {

    if (
      b.priorityScore !==
      a.priorityScore
    ) {

      return (
        b.priorityScore -
        a.priorityScore
      );

    }

    return a.skill.localeCompare(
      b.skill
    );

  });
};

// =====================================
// CALCULATE SKILL COVERAGE
// =====================================

const calculateCoverage = (

  expectedSkills: string[],

  matchedSkills: Set<string>

): number | null => {

  if (expectedSkills.length === 0) {
    return null;
  }

  const coveredSkills =
    expectedSkills.filter(

      (skill) =>
        matchedSkills.has(
          normalizeSkill(skill)
        )

    ).length;

  return Math.round(

    (coveredSkills /
      expectedSkills.length) * 100

  );
};

// =====================================
// GENERATE SKILL GAP STATISTICS
// =====================================

export const calculateSkillGapStatistics = (

  analysis: JobMatchingResponse,

  skillGaps: SkillGapItem[]

): SkillGapStatistics => {

  const requiredSkills =
    uniqueSkills(
      analysis.requiredSkills
    );

  const requiredSet = new Set(

    requiredSkills.map(
      normalizeSkill
    )

  );

  // Avoid counting a required skill
  // again as a preferred skill.

  const preferredSkills =
    uniqueSkills(
      analysis.preferredSkills
    ).filter(

      (skill) =>
        !requiredSet.has(
          normalizeSkill(skill)
        )

    );

  const matchedSkills = new Set(

    analysis.matchedSkills

      .map((item) =>
        normalizeSkill(item.skill)
      )

      .filter(Boolean)

  );

  const missingRequiredSkills =
    skillGaps.filter(

      (item) =>
        item.importance === "required"

    ).length;

  const missingPreferredSkills =
    skillGaps.filter(

      (item) =>
        item.importance === "preferred"

    ).length;

  return {

    totalRequiredSkills:
      requiredSkills.length,

    totalPreferredSkills:
      preferredSkills.length,

    totalMatchedSkills:
      matchedSkills.size,

    totalMissingSkills:
      skillGaps.length,

    missingRequiredSkills,

    missingPreferredSkills,

    criticalGaps:
      skillGaps.filter(
        (item) =>
          item.priority === "critical"
      ).length,

    highPriorityGaps:
      skillGaps.filter(
        (item) =>
          item.priority === "high"
      ).length,

    mediumPriorityGaps:
      skillGaps.filter(
        (item) =>
          item.priority === "medium"
      ).length,

    lowPriorityGaps:
      skillGaps.filter(
        (item) =>
          item.priority === "low"
      ).length,

    requiredSkillCoverage:
      calculateCoverage(

        requiredSkills,

        matchedSkills

      ),

    preferredSkillCoverage:
      calculateCoverage(

        preferredSkills,

        matchedSkills

      ),

  };
};

// =====================================
// COMPLETE SKILL GAP CALCULATION
// =====================================

export const calculateSkillGapAnalysis = (
  analysis: JobMatchingResponse
) => {

  const skillGaps =
    prioritizeSkillGaps(analysis);

  const statistics =
    calculateSkillGapStatistics(

      analysis,

      skillGaps

    );

  return {

    skillGaps,

    statistics,

    analysisVersion:
      SKILL_GAP_ANALYSIS_VERSION,

  };
};
import type {
  RoadmapResponse,
  RoadmapRequest,
  RoadmapProject,
} from "../validators/roadmap.validator.js";

import type {
  SkillGapItem,
} from "../validators/skillGap.validator.js";

export const ROADMAP_NORMALIZATION_VERSION =
  "1.0.0";

// Normalize skill names for comparison.

const normalizeSkillName = (
  skill: string
): string => {
  return skill
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

// Normalize generated roadmap.

export const normalizeGeneratedRoadmap = (
  roadmap: RoadmapResponse,
  request: RoadmapRequest,
  skillGaps: SkillGapItem[]
): RoadmapResponse => {

  // =====================================
  // 1. CREATE ALLOWED SKILL LOOKUP
  // =====================================

  const allowedSkills =
    new Map<string, string>();

  for (const gap of skillGaps) {
    allowedSkills.set(
      normalizeSkillName(gap.skill),
      gap.skill
    );
  }

  // Resolve skill names against original gaps.

  const resolveSkills = (
    skills: string[]
  ): string[] => {

    const resolved = new Set<string>();

    for (const skill of skills) {

      const originalSkill =
        allowedSkills.get(
          normalizeSkillName(skill)
        );

      if (originalSkill) {
        resolved.add(originalSkill);
      }

    }

    return Array.from(resolved);
  };

  // =====================================
  // 2. NORMALIZE WEEKLY ACTIVITIES
  // =====================================

  const milestones =
    roadmap.milestones.map((milestone) => {

      const activities =
        milestone.activities

          .map((activity) => ({

            ...activity,

            targetSkills: resolveSkills(
              activity.targetSkills
            ),

          }))

          // Remove activities that have no
          // supported learning targets.

          .filter(
            (activity) =>
              activity.targetSkills.length > 0
          );

      // Derive weekly targets from activities
      // instead of trusting AI-generated lists.

      const targetSkills = Array.from(

        new Set(
          activities.flatMap(
            (activity) =>
              activity.targetSkills
          )
        )

      );

      return {

        ...milestone,

        targetSkills,

        activities,

      };

    });

  // =====================================
  // 3. DERIVE COVERED SKILLS
  // =====================================

  const coveredSkillSet = new Set(

    milestones.flatMap(
      (milestone) =>

        milestone.activities.flatMap(
          (activity) =>
            activity.targetSkills
        )
    )

  );

  const coveredSkills =
    skillGaps

      .map((gap) => gap.skill)

      .filter((skill) =>
        coveredSkillSet.has(skill)
      );

  // =====================================
  // 4. DERIVE DEFERRED SKILLS
  // =====================================

  const originalDeferredReasons =
    new Map<string, string>();

  for (
    const item of roadmap.deferredSkills
  ) {

    originalDeferredReasons.set(

      normalizeSkillName(item.skill),

      item.reason

    );

  }

  const deferredSkills =
    skillGaps

      .filter(
        (gap) =>
          !coveredSkillSet.has(gap.skill)
      )

      .map((gap) => ({

        skill: gap.skill,

        reason:

          originalDeferredReasons.get(
            normalizeSkillName(gap.skill)
          ) ||

          "This skill has no scheduled learning activity in the current roadmap.",

      }));

  // =====================================
  // 5. REBUILD PRACTICAL PROJECTS
  // =====================================

  const practicalProjects:
    RoadmapProject[] = [];

  for (const milestone of milestones) {

    for (
      const activity of milestone.activities
    ) {

      if (
        activity.type !== "project"
      ) {
        continue;
      }

      practicalProjects.push({

        title:
          activity.title,

        description:
          activity.description,

        difficulty:
          request.difficulty,

        targetSkills:
          activity.targetSkills,

        deliverables: [
          activity.expectedOutcome.slice(
            0,
            500
          ),
        ],

        estimatedHours:
          activity.estimatedHours,

      });

    }

  }

  // =====================================
  // 6. RETURN NORMALIZED ROADMAP
  // =====================================

  const normalizedRoadmap:
    RoadmapResponse = {

      ...roadmap,

      coveredSkills: Array.from(
        new Set(coveredSkills)
      ),

      deferredSkills,

      milestones,

      practicalProjects:
        practicalProjects.slice(0, 5),

    };

  console.log(
    "Roadmap normalization completed"
  );

  console.log(
    "Normalized covered skills:",
    normalizedRoadmap.coveredSkills.length
  );

  console.log(
    "Normalized deferred skills:",
    normalizedRoadmap.deferredSkills.length
  );

  console.log(
    "Normalized practical projects:",
    normalizedRoadmap.practicalProjects.length
  );

  return normalizedRoadmap;
};
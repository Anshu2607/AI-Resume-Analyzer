import mongoose from "mongoose";

import Analysis from "../models/analysis.model.js";

import {
  semanticSearch,
} from "../services/vectorSearch.service.js";

import {
  getJobMatchById,
  matchResumeToJob,
} from "../services/jobMatching.service.js";

import {
  getSkillGapReport,
  generateCareerRoadmap,
  getRoadmapById,
} from "../services/roadmap.service.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

import {
  AGENT_CONFIG,
} from "../config/agent.config.js";

import {

  resumeAnalysisToolSchema,

  resumeSearchToolSchema,

  jobMatchToolSchema,

  generateJobMatchToolSchema,

  skillGapToolSchema,

  generateRoadmapToolSchema,

  roadmapProgressToolSchema,

} from "../validators/agent.validator.js";

import type {
  AgentToolName,
  AgentArtifact,
} from "../validators/agent.validator.js";

import {

  AgentToolError,

  getAgentTool,

  validateToolArguments,

} from "./agentToolRegistry.js";

import type {

  AgentToolContext,

  AgentToolResult,

} from "./agentToolRegistry.js";

// =====================================
// SAFE TEXT PROCESSING
// =====================================

const safeText = (

  value: unknown,

  maxLength = 1000

): string => {

  if (typeof value !== "string") {

    return "";

  }

  return redactPersonalInformation(
    value
  ).slice(0, maxLength);

};

// =====================================
// VERIFY RESOURCE SCOPE
// =====================================

const verifyResourceScope = (

  resourceId: string,

  allowedIds: string[]

): void => {

  if (
    !mongoose.isValidObjectId(resourceId)
  ) {

    throw new AgentToolError(
      "Invalid resource ID",
      400
    );

  }

  const authorized = allowedIds.some(

    (id) =>
      id.toLowerCase() ===
      resourceId.toLowerCase()

  );

  if (!authorized) {

    throw new AgentToolError(
      "Resource is outside the authorized agent scope",
      403
    );

  }

};

// =====================================
// CREATE SAFE TOOL RESULT
// =====================================

const createToolResult = (

  summary: string,

  data: Record<string, unknown>,

  artifacts: AgentArtifact[] = []

): AgentToolResult => {

  return {

    success: true,

    summary: safeText(

      summary,

      AGENT_CONFIG.maxResultSummaryCharacters

    ),

    data,

    artifacts,

  };

};

// =====================================
// 1. GET RESUME ANALYSIS
// =====================================

const executeResumeAnalysis = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    resumeAnalysisToolSchema.parse(input);

  verifyResourceScope(

    args.analysisId,

    context.availableResources.analysisIds

  );

  // Retrieve only an analysis owned by
  // the authenticated user.

  const analysis = await Analysis.findOne({

    _id: args.analysisId,

    userId: context.userId,

  }).lean();

  if (!analysis) {

    throw new AgentToolError(
      "Resume analysis not found",
      404
    );

  }

  // Use an explicit allowlist rather than
  // forwarding the entire database document.

  const record =
    analysis as unknown as Record<
      string,
      unknown
    >;

  const data: Record<string, unknown> = {

    analysisId:
      String(analysis._id),

    overallScore:
      typeof record.overallScore === "number"
        ? record.overallScore
        : null,

    createdAt:
      record.createdAt
        ? String(record.createdAt)
        : null,

  };

  // Support the existing structured result
  // while forwarding only selected fields.

  const result =
    record.result &&
    typeof record.result === "object"

      ? record.result as Record<
          string,
          unknown
        >

      : record;

  if (
    typeof result.summary === "string"
  ) {

    data.summary =
      safeText(
        result.summary,
        2000
      );

  }

  for (
    const key of [
      "strengths",
      "weaknesses",
      "recommendations",
    ]
  ) {

    const value = result[key];

    if (Array.isArray(value)) {

      data[key] = value

        .filter(
          (item): item is string =>
            typeof item === "string"
        )

        .slice(0, 10)

        .map(
          (item) =>
            safeText(item, 500)
        );

    }

  }

  return createToolResult(

    "Retrieved the authorized resume analysis.",

    data,

    [
      {
        type: "resume_analysis",

        referenceId:
          String(analysis._id),

        title:
          "Resume Analysis",
      },
    ]

  );

};

// =====================================
// 2. SEMANTIC RESUME SEARCH
// =====================================

const executeResumeSearch = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    resumeSearchToolSchema.parse(input);

  verifyResourceScope(

    args.resumeId,

    context.availableResources.resumeIds

  );

  const result = await semanticSearch({

    userId:
      context.userId,

    resumeId:
      args.resumeId,

    query:
      safeText(args.query),

    limit:
      args.limit,

  });

  return createToolResult(

    `Retrieved ${result.count} relevant resume excerpts.`,

    {

      resumeId:
        result.resumeId,

      count:
        result.count,

      results:
        result.results.map(
          (item) => ({

            chunkIndex:
              item.chunkIndex,

            content:
              safeText(
                item.content,
                1000
              ),

            score:
              item.score,

          })
        ),

    }

  );

};

// =====================================
// 3. GET EXISTING JOB MATCH
// =====================================

const executeGetJobMatch = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    jobMatchToolSchema.parse(input);

  verifyResourceScope(

    args.jobMatchId,

    context.availableResources.jobMatchIds

  );

  const report =
    await getJobMatchById(

      context.userId,

      args.jobMatchId

    );

  return createToolResult(

    `Retrieved job compatibility report with a score of ${report.overallScore}/100.`,

    {

      jobMatchId:
        String(report._id),

      jobTitle:
        safeText(report.jobTitle, 150),

      companyName:
        safeText(report.companyName, 150),

      overallScore:
        report.overallScore,

      semanticScore:
        report.semanticScore,

      compatibilityLevel:
        report.compatibilityLevel,

      summary:
        safeText(
          report.result.summary,
          1500
        ),

      matchedSkills:
        report.result.matchedSkills

          .slice(0, 25)

          .map((item) => ({

            skill:
              safeText(item.skill, 150),

            matchType:
              item.matchType,

          })),

      missingSkills:
        report.result.missingSkills

          .slice(0, 25)

          .map((item) => ({

            skill:
              safeText(item.skill, 150),

            importance:
              item.importance,

          })),

    },

    [
      {

        type: "job_match",

        referenceId:
          String(report._id),

        title:
          safeText(
            report.jobTitle,
            150
          ) || "Job Matching Report",

      },
    ]

  );

};

// =====================================
// 4. GENERATE JOB MATCH
// =====================================

const executeGenerateJobMatch = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    generateJobMatchToolSchema.parse(input);

  verifyResourceScope(

    args.resumeId,

    context.availableResources.resumeIds

  );

  const {

    jobTitle,

    companyName,

    jobDescription,

  } = context.request;

  if (
    !jobTitle ||
    !jobDescription
  ) {

    throw new AgentToolError(

      "Job title and job description must be provided by the user",

      400

    );

  }

  // The AI cannot invent or replace the
  // user's job description.

  const report =
    await matchResumeToJob(

      context.userId,

      {

        resumeId:
          args.resumeId,

        jobTitle,

        companyName,

        jobDescription,

        consent: true,

      }

    );

  const jobMatchId =
    String(report._id);

  return createToolResult(

    `Generated a job matching report with compatibility score ${report.overallScore}/100.`,

    {

      jobMatchId,

      overallScore:
        report.overallScore,

      semanticScore:
        report.semanticScore,

      compatibilityLevel:
        report.compatibilityLevel,

      matchedSkills:
        report.result.matchedSkills

          .slice(0, 25)

          .map(
            (item) =>
              safeText(item.skill, 150)
          ),

      missingSkills:
        report.result.missingSkills

          .slice(0, 25)

          .map((item) => ({

            skill:
              safeText(item.skill, 150),

            importance:
              item.importance,

          })),

    },

    [
      {

        type: "job_match",

        referenceId:
          jobMatchId,

        title:
          safeText(
            report.jobTitle,
            150
          ) || "Generated Job Match",

      },
    ]

  );

};

// =====================================
// 5. GET SKILL GAP ANALYSIS
// =====================================

const executeSkillGaps = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    skillGapToolSchema.parse(input);

  verifyResourceScope(

    args.jobMatchId,

    context.availableResources.jobMatchIds

  );

  const report =
    await getSkillGapReport(

      context.userId,

      args.jobMatchId

    );

  return createToolResult(

    `Identified ${report.statistics.totalMissingSkills} skill gaps, including ${report.statistics.criticalGaps} critical gaps.`,

    {

      jobMatchId:
        report.jobMatchId,

      jobTitle:
        safeText(report.jobTitle, 150),

      statistics:
        report.statistics,

      skillGaps:
        report.skillGaps

          .slice(0, 25)

          .map((item) => ({

            skill:
              safeText(item.skill, 150),

            importance:
              item.importance,

            priority:
              item.priority,

            priorityScore:
              item.priorityScore,

            evidenceStatus:
              item.evidenceStatus,

            recommendation:
              safeText(
                item.recommendation,
                300
              ),

          })),

    },

    [
      {

        type: "skill_gap_report",

        referenceId:
          report.jobMatchId,

        title:
          "Prioritized Skill Gap Analysis",

      },
    ]

  );

};

// =====================================
// 6. GENERATE CAREER ROADMAP
// =====================================

const executeGenerateRoadmap = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    generateRoadmapToolSchema.parse(input);

  verifyResourceScope(

    args.jobMatchId,

    context.availableResources.jobMatchIds

  );

  const preferences =
    context.request.learningPreferences;

  const roadmap =
    await generateCareerRoadmap(

      context.userId,

      {

        jobMatchId:
          args.jobMatchId,

        durationWeeks:
          preferences.durationWeeks,

        hoursPerWeek:
          preferences.hoursPerWeek,

        difficulty:
          preferences.difficulty,

        consent: true,

      }

    );

  return createToolResult(

    `Generated a ${roadmap.durationWeeks}-week learning roadmap containing ${roadmap.totalActivities} activities.`,

    {

      roadmapId:
        String(roadmap._id),

      title:
        safeText(
          roadmap.result.title,
          200
        ),

      durationWeeks:
        roadmap.durationWeeks,

      hoursPerWeek:
        roadmap.hoursPerWeek,

      estimatedLearningHours:
        roadmap.estimatedLearningHours,

      totalActivities:
        roadmap.totalActivities,

      coveredSkills:
        roadmap.result.coveredSkills

          .slice(0, 25)

          .map(
            (skill) =>
              safeText(skill, 150)
          ),

      deferredSkills:
        roadmap.result.deferredSkills

          .slice(0, 25)

          .map((item) => ({

            skill:
              safeText(item.skill, 150),

            reason:
              safeText(
                item.reason,
                300
              ),

          })),

      milestones:
        roadmap.result.milestones.map(
          (item) => ({

            week:
              item.week,

            title:
              safeText(item.title, 200),

            objective:
              safeText(
                item.objective,
                300
              ),

            activities:
              item.activities.length,

          })
        ),

    },

    [
      {

        type: "roadmap",

        referenceId:
          String(roadmap._id),

        title:
          safeText(
            roadmap.result.title,
            200
          ) || "Career Roadmap",

      },
    ]

  );

};

// =====================================
// 7. GET ROADMAP PROGRESS
// =====================================

const executeRoadmapProgress = async (

  context: AgentToolContext,

  input: unknown

): Promise<AgentToolResult> => {

  const args =
    roadmapProgressToolSchema.parse(input);

  verifyResourceScope(

    args.roadmapId,

    context.availableResources.roadmapIds

  );

  const roadmap =
    await getRoadmapById(

      context.userId,

      args.roadmapId

    );

  const nextActivities = roadmap.result.milestones

    .flatMap(
      (milestone) =>

        milestone.activities.map(
          (activity, index) => ({

            week:
              milestone.week,

            activityIndex:
              index,

            title:
              safeText(
                activity.title,
                200
              ),

            estimatedHours:
              activity.estimatedHours,

            completed:
              roadmap.activityProgress.some(
                (progress) =>

                  progress.week ===
                    milestone.week &&

                  progress.activityIndex ===
                    index &&

                  progress.completed

              ),

          })
        )

    )

    .filter(
      (activity) =>
        !activity.completed
    )

    .slice(0, 5);

  return createToolResult(

    `Current learning progress is ${roadmap.progressPercentage}%, with ${roadmap.completedActivities} of ${roadmap.totalActivities} activities completed.`,

    {

      roadmapId:
        String(roadmap._id),

      status:
        roadmap.status,

      progressPercentage:
        roadmap.progressPercentage,

      totalActivities:
        roadmap.totalActivities,

      completedActivities:
        roadmap.completedActivities,

      remainingActivities:
        roadmap.totalActivities -
        roadmap.completedActivities,

      nextActivities,

    },

    [
      {

        type: "roadmap",

        referenceId:
          String(roadmap._id),

        title:
          safeText(
            roadmap.result.title,
            200
          ) || "Career Roadmap",

      },
    ]

  );

};

// =====================================
// TOOL HANDLER INTERFACE
// =====================================

type AgentToolHandler = (

  context: AgentToolContext,

  input: unknown

) => Promise<AgentToolResult>;

// =====================================
// REGISTER TOOL HANDLERS
// =====================================

const TOOL_HANDLERS: Record<
  AgentToolName,
  AgentToolHandler
> = {

  get_resume_analysis:
    executeResumeAnalysis,

  search_resume:
    executeResumeSearch,

  get_job_match:
    executeGetJobMatch,

  generate_job_match:
    executeGenerateJobMatch,

  get_skill_gaps:
    executeSkillGaps,

  generate_roadmap:
    executeGenerateRoadmap,

  get_roadmap_progress:
    executeRoadmapProgress,

};

// =====================================
// CENTRAL AGENT TOOL EXECUTOR
// =====================================

export const executeAgentTool = async (

  toolName: AgentToolName,

  input: unknown,

  context: AgentToolContext,

  approved = false

): Promise<AgentToolResult> => {

  if (
    !mongoose.isValidObjectId(
      context.userId
    )
  ) {

    throw new AgentToolError(
      "Invalid authenticated user",
      401
    );

  }

  // The planner and observations may
  // be processed by external AI.

  if (context.request.consent !== true) {

    throw new AgentToolError(
      "External AI processing consent is required",
      403
    );

  }

  const tool = getAgentTool(toolName);

  // Prevent unauthorized create operations.

  if (
    tool.requiresApproval &&
    !approved
  ) {

    throw new AgentToolError(
      "User approval is required before executing this tool",
      403
    );

  }

  const validatedArguments =
    validateToolArguments(
      toolName,
      input
    );

  const handler =
    TOOL_HANDLERS[toolName];

  if (!handler) {

    throw new AgentToolError(
      "Tool handler is unavailable",
      400
    );

  }

  const startTime = Date.now();

  console.log(
    "Executing agent tool:",
    toolName
  );

  const result =
    await handler(

      context,

      validatedArguments

    );

  console.log(

    "Agent tool completed:",

    toolName,

    Date.now() - startTime,

    "ms"

  );

  return result;

};
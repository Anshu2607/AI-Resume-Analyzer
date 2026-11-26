import { z } from "zod";

import {
  AGENT_TOOL_POLICIES,
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
  AgentRequest,
  AgentArtifact,
} from "../validators/agent.validator.js";

// =====================================
// AGENT EXECUTION CONTEXT
// =====================================

export interface AgentToolContext {

  userId: string;

  request: AgentRequest;

  availableResources: {

    resumeIds: string[];

    analysisIds: string[];

    jobMatchIds: string[];

    roadmapIds: string[];

  };

}

// =====================================
// TOOL RESULT INTERFACE
// =====================================

export interface AgentToolResult {

  success: boolean;

  summary: string;

  data: Record<string, unknown>;

  artifacts: AgentArtifact[];

}

// =====================================
// TOOL DEFINITION INTERFACE
// =====================================

export interface AgentToolDefinition {

  name: AgentToolName;

  description: string;

  argumentSchema: z.ZodType;

  argumentsDescription: Record<string, string>;

  operation: "read" | "create";

  usesExternalAI: boolean;

  requiresApproval: boolean;

  enabled: boolean;

}

// =====================================
// AGENT TOOL ERROR
// =====================================

export class AgentToolError extends Error {

  constructor(
    message: string,
    public statusCode: number
  ) {

    super(message);

    this.name = "AgentToolError";

  }

}

// =====================================
// CREATE TOOL DEFINITION
// =====================================

const defineTool = (

  name: AgentToolName,

  argumentSchema: z.ZodType,

  argumentsDescription: Record<string, string>

): AgentToolDefinition => {

  return {

    name,

    argumentSchema,

    argumentsDescription,

    ...AGENT_TOOL_POLICIES[name],

  };

};

// =====================================
// TOOL REGISTRY
// =====================================

export const AGENT_TOOL_REGISTRY: Record<
  AgentToolName,
  AgentToolDefinition
> = {

  get_resume_analysis: defineTool(

    "get_resume_analysis",

    resumeAnalysisToolSchema,

    {
      analysisId:
        "An existing authorized resume analysis ID.",
    }

  ),

  search_resume: defineTool(

    "search_resume",

    resumeSearchToolSchema,

    {

      resumeId:
        "An authorized indexed resume ID.",

      query:
        "A relevant semantic search query between 3 and 1000 characters.",

      limit:
        "Optional number of results between 1 and 5. Default is 3.",

    }

  ),

  get_job_match: defineTool(

    "get_job_match",

    jobMatchToolSchema,

    {
      jobMatchId:
        "An existing authorized job matching report ID.",
    }

  ),

  generate_job_match: defineTool(

    "generate_job_match",

    generateJobMatchToolSchema,

    {

      resumeId:
        "An authorized processed resume ID. Job details are obtained from validated user input.",

    }

  ),

  get_skill_gaps: defineTool(

    "get_skill_gaps",

    skillGapToolSchema,

    {

      jobMatchId:
        "An authorized job matching report ID.",

    }

  ),

  generate_roadmap: defineTool(

    "generate_roadmap",

    generateRoadmapToolSchema,

    {

      jobMatchId:
        "An authorized job matching report ID. Learning preferences are obtained from validated user input.",

    }

  ),

  get_roadmap_progress: defineTool(

    "get_roadmap_progress",

    roadmapProgressToolSchema,

    {

      roadmapId:
        "An authorized saved career roadmap ID.",

    }

  ),

};

// =====================================
// RETRIEVE TOOL DEFINITION
// =====================================

export const getAgentTool = (

  toolName: AgentToolName

): AgentToolDefinition => {

  const tool =
    AGENT_TOOL_REGISTRY[toolName];

  if (!tool || !tool.enabled) {

    throw new AgentToolError(
      "Requested agent tool is unavailable",
      400
    );

  }

  return tool;

};

// =====================================
// VALIDATE TOOL ARGUMENTS
// =====================================

export const validateToolArguments = (

  toolName: AgentToolName,

  args: unknown

): unknown => {

  const tool = getAgentTool(toolName);

  const validation =
    tool.argumentSchema.safeParse(args);

  if (!validation.success) {

    const issues =
      validation.error.issues.map(
        (issue) => ({

          field: issue.path.join("."),

          code: issue.code,

        })
      );

    console.warn(

      "Agent tool argument validation failed:",

      toolName,

      issues

    );

    throw new AgentToolError(
      `Invalid arguments for tool: ${toolName}`,
      400
    );

  }

  return validation.data;

};

// =====================================
// PROVIDE TOOL CATALOG TO AI PLANNER
// =====================================

export const getAgentToolCatalog = () => {

  return Object.values(
    AGENT_TOOL_REGISTRY
  )

    .filter(
      (tool) => tool.enabled
    )

    .map((tool) => ({

      name: tool.name,

      description:
        tool.description,

      arguments:
        tool.argumentsDescription,

      operation:
        tool.operation,

      usesExternalAI:
        tool.usesExternalAI,

      requiresApproval:
        tool.requiresApproval,

    }));

};
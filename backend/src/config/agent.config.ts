import type {
  AgentToolName,
} from "../validators/agent.validator.js";

// =====================================
// AGENT VERSION
// =====================================

export const AGENT_VERSION =
  "1.0.0";

// =====================================
// AGENT EXECUTION LIMITS
// =====================================

export const AGENT_CONFIG = {

  // Maximum planning iterations

  maxIterations: 8,

  // Maximum tool executions per run

  maxToolCalls: 6,

  // Maximum executions of the same tool

  maxCallsPerTool: 2,

  // Maximum AI-backed tool executions

  maxGenerativeToolCalls: 2,

  // Maximum planning response attempts

  maxPlanningAttempts: 2,

  // Overall execution time budget

  maxExecutionTimeMs: 240000,

  // Maximum observation length

  maxObservationCharacters: 6000,

  // Maximum combined observation context

  maxTotalObservationCharacters: 18000,

  // Maximum stored result summary

  maxResultSummaryCharacters: 5000,

  // Maximum generated artifact references

  maxArtifacts: 20,

  // Stop excessive consecutive failures

  maxConsecutiveToolFailures: 2,

  // Prevent repeated identical operations

  preventDuplicateToolCalls: true,

} as const;

// =====================================
// TOOL PERMISSION INTERFACE
// =====================================

export interface AgentToolPolicy {

  description: string;

  operation: "read" | "create";

  usesExternalAI: boolean;

  requiresApproval: boolean;

  enabled: boolean;

}

// =====================================
// TOOL PERMISSIONS
// =====================================

export const AGENT_TOOL_POLICIES: Record<
  AgentToolName,
  AgentToolPolicy
> = {

  get_resume_analysis: {

    description:
      "Retrieve an existing resume analysis owned by the authenticated user.",

    operation: "read",

    usesExternalAI: false,

    requiresApproval: false,

    enabled: true,

  },

  search_resume: {

    description:
      "Search indexed resume chunks for relevant supporting evidence.",

    operation: "read",

    usesExternalAI: false,

    requiresApproval: false,

    enabled: true,

  },

  get_job_match: {

    description:
      "Retrieve an existing job compatibility report.",

    operation: "read",

    usesExternalAI: false,

    requiresApproval: false,

    enabled: true,

  },

  generate_job_match: {

    description:
      "Generate and save a new job compatibility report using supplied job details.",

    operation: "create",

    usesExternalAI: true,

    requiresApproval: true,

    enabled: true,

  },

  get_skill_gaps: {

    description:
      "Calculate skill gaps and learning priorities from an existing job matching report.",

    operation: "read",

    usesExternalAI: false,

    requiresApproval: false,

    enabled: true,

  },

  generate_roadmap: {

    description:
      "Generate and save a personalized career roadmap from an existing job matching report.",

    operation: "create",

    usesExternalAI: true,

    requiresApproval: true,

    enabled: true,

  },

  get_roadmap_progress: {

    description:
      "Retrieve current learning progress from a saved career roadmap.",

    operation: "read",

    usesExternalAI: false,

    requiresApproval: false,

    enabled: true,

  },

};

// =====================================
// CHECK IF TOOL IS ENABLED
// =====================================

export const isAgentToolEnabled = (
  toolName: AgentToolName
): boolean => {

  return (
    AGENT_TOOL_POLICIES[toolName].enabled
  );

};

// =====================================
// CHECK APPROVAL REQUIREMENT
// =====================================

export const requiresToolApproval = (
  toolName: AgentToolName
): boolean => {

  return (
    AGENT_TOOL_POLICIES[toolName]
      .requiresApproval
  );

};

// =====================================
// CHECK EXTERNAL AI USAGE
// =====================================

export const toolUsesExternalAI = (
  toolName: AgentToolName
): boolean => {

  return (
    AGENT_TOOL_POLICIES[toolName]
      .usesExternalAI
  );

};

// =====================================
// GET ENABLED AGENT TOOLS
// =====================================

export const getEnabledAgentTools =
  (): AgentToolName[] => {

    return (

      Object.keys(
        AGENT_TOOL_POLICIES
      ) as AgentToolName[]

    ).filter(
      isAgentToolEnabled
    );

  };
import {
  AGENT_CONFIG,
} from "../config/agent.config.js";

import type {
  AgentToolContext,
  AgentToolResult,
} from "./agentToolRegistry.js";

import type {
  AgentObservation,
} from "../prompts/agent.prompt.js";

import type {
  AgentRequest,
  AgentStatus,
  AgentToolName,
  AgentExecutionStep,
  AgentArtifact,
  AgentResponse,
} from "../validators/agent.validator.js";

// =====================================
// PENDING APPROVAL
// =====================================

export interface PendingToolApproval {

  stepNumber: number;

  toolName: AgentToolName;

  arguments: Record<string, unknown>;

  purpose: string;

  requestedAt: string;

}

// =====================================
// CLARIFICATION REQUEST
// =====================================

export interface AgentClarification {

  question: string;

  missingFields: string[];

}

// =====================================
// AGENT STATE
// =====================================

export interface AgentState {

  context: AgentToolContext;

  status: AgentStatus;

  iteration: number;

  totalToolCalls: number;

  generativeToolCalls: number;

  consecutiveToolFailures: number;

  executedToolSignatures: string[];

  executionSteps: AgentExecutionStep[];

  observations: AgentObservation[];

  artifacts: AgentArtifact[];

  pendingApproval: PendingToolApproval | null;

  clarification: AgentClarification | null;

  finalResponse: AgentResponse | null;

  errorMessage: string | null;

  provider: "groq" | "gemini" | null;

  modelUsed: string | null;

  promptVersion: string | null;

  startedAt: string;

  completedAt: string | null;

  activeExecutionTimeMs: number;

}

// =====================================
// INITIALIZE AGENT STATE
// =====================================

export const createAgentState = (

  userId: string,

  request: AgentRequest

): AgentState => {

  return {

    context: {

      userId,

      request,

      availableResources: {

        resumeIds:
          request.resumeId
            ? [request.resumeId]
            : [],

        analysisIds:
          request.analysisId
            ? [request.analysisId]
            : [],

        jobMatchIds:
          request.jobMatchId
            ? [request.jobMatchId]
            : [],

        roadmapIds:
          request.roadmapId
            ? [request.roadmapId]
            : [],

      },

    },

    status: "pending",

    iteration: 0,

    totalToolCalls: 0,

    generativeToolCalls: 0,

    consecutiveToolFailures: 0,

    executedToolSignatures: [],

    executionSteps: [],

    observations: [],

    artifacts: [],

    pendingApproval: null,

    clarification: null,

    finalResponse: null,

    errorMessage: null,

    provider: null,

    modelUsed: null,

    promptVersion: null,

    startedAt:
      new Date().toISOString(),

    completedAt: null,

    activeExecutionTimeMs: 0,

  };

};

// =====================================
// REMAINING EXECUTION BUDGET
// =====================================

export const getRemainingToolCalls = (

  state: AgentState

): number => {

  return Math.max(

    0,

    AGENT_CONFIG.maxToolCalls -
      state.totalToolCalls

  );

};

export const getRemainingGenerativeCalls = (

  state: AgentState

): number => {

  return Math.max(

    0,

    AGENT_CONFIG.maxGenerativeToolCalls -
      state.generativeToolCalls

  );

};

// =====================================
// CANONICAL TOOL ARGUMENTS
// =====================================

const canonicalize = (
  value: unknown
): unknown => {

  if (Array.isArray(value)) {

    return value.map(canonicalize);

  }

  if (
    value !== null &&
    typeof value === "object"
  ) {

    const record =
      value as Record<string, unknown>;

    return Object.fromEntries(

      Object.keys(record)

        .sort()

        .map((key) => [

          key,

          canonicalize(record[key]),

        ])

    );

  }

  return value;

};

// =====================================
// GENERATE UNIQUE TOOL SIGNATURE
// =====================================

export const createToolSignature = (

  toolName: AgentToolName,

  args: Record<string, unknown>

): string => {

  return `${toolName}:${JSON.stringify(
    canonicalize(args)
  )}`;

};

// =====================================
// CHECK DUPLICATE TOOL EXECUTION
// =====================================

export const hasExecutedTool = (

  state: AgentState,

  signature: string

): boolean => {

  return state.executedToolSignatures
    .includes(signature);

};

// =====================================
// ADD AUTHORIZED RESOURCE
// =====================================

const addUniqueResource = (

  resources: string[],

  id: string

): void => {

  if (!resources.includes(id)) {

    resources.push(id);

  }

};

// =====================================
// REGISTER SUCCESSFUL ARTIFACT
// =====================================

export const registerArtifact = (

  state: AgentState,

  artifact: AgentArtifact

): void => {

  const exists = state.artifacts.some(

    (item) =>

      item.type === artifact.type &&

      item.referenceId ===
        artifact.referenceId

  );

  if (
    !exists &&
    state.artifacts.length <
      AGENT_CONFIG.maxArtifacts
  ) {

    state.artifacts.push(artifact);

  }

  // Expand the authorized resource scope
  // only using successful backend results.

  const resources =
    state.context.availableResources;

  switch (artifact.type) {

    case "resume_analysis":

      addUniqueResource(

        resources.analysisIds,

        artifact.referenceId

      );

      break;

    case "job_match":

      addUniqueResource(

        resources.jobMatchIds,

        artifact.referenceId

      );

      break;

    case "roadmap":

      addUniqueResource(

        resources.roadmapIds,

        artifact.referenceId

      );

      break;

    case "skill_gap_report":

      addUniqueResource(

        resources.jobMatchIds,

        artifact.referenceId

      );

      break;

  }

};

// =====================================
// RECORD SUCCESSFUL TOOL OBSERVATION
// =====================================

export const recordToolSuccess = (

  state: AgentState,

  step: AgentExecutionStep,

  result: AgentToolResult

): void => {

  step.status = "completed";

  step.completedAt =
    new Date().toISOString();

  step.durationMs = Math.max(

    0,

    Date.now() -
      new Date(step.startedAt).getTime()

  );

  step.resultSummary =
    result.summary.slice(

      0,

      AGENT_CONFIG.maxResultSummaryCharacters

    );

  step.errorMessage = null;

  state.consecutiveToolFailures = 0;

  state.observations.push({

    stepNumber:
      step.stepNumber,

    toolName:
      step.toolName,

    success: true,

    summary:
      step.resultSummary,

    data:
      result.data,

  });

  for (
    const artifact of result.artifacts
  ) {

    registerArtifact(

      state,

      artifact

    );

  }

};

// =====================================
// RECORD FAILED TOOL OBSERVATION
// =====================================

export const recordToolFailure = (

  state: AgentState,

  step: AgentExecutionStep,

  errorMessage: string

): void => {

  step.status = "failed";

  step.completedAt =
    new Date().toISOString();

  step.durationMs = Math.max(

    0,

    Date.now() -
      new Date(step.startedAt).getTime()

  );

  step.errorMessage =
    errorMessage.slice(0, 1000);

  step.resultSummary = null;

  state.consecutiveToolFailures++;

  state.observations.push({

    stepNumber:
      step.stepNumber,

    toolName:
      step.toolName,

    success: false,

    summary:
      step.errorMessage,

    data: {},

  });

};

// =====================================
// COMPLETE AGENT EXECUTION
// =====================================

export const completeAgentState = (

  state: AgentState,

  response: AgentResponse

): void => {

  state.status = "completed";

  state.finalResponse = response;

  state.pendingApproval = null;

  state.clarification = null;

  state.errorMessage = null;

  state.completedAt =
    new Date().toISOString();

};

// =====================================
// FAIL AGENT EXECUTION
// =====================================

export const failAgentState = (

  state: AgentState,

  message: string

): void => {

  state.status = "failed";

  state.errorMessage =
    message.slice(0, 1000);

  state.pendingApproval = null;

  state.completedAt =
    new Date().toISOString();

};
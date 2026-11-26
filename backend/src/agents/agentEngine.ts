import mongoose from "mongoose";

import {
  AGENT_CONFIG,
} from "../config/agent.config.js";

import {
  agentRequestSchema,
  agentApprovalSchema,
} from "../validators/agent.validator.js";

import type {
  AgentToolName,
  AgentExecutionStep,
  AgentResponse,
} from "../validators/agent.validator.js";

import {
  planAgentAction,
  AgentPlannerError,
} from "./agentPlanner.js";

import {
  executeAgentTool,
} from "./agentTools.js";

import {

  getAgentTool,

  validateToolArguments,

  AgentToolError,

} from "./agentToolRegistry.js";

import {

  createAgentState,

  getRemainingToolCalls,

  getRemainingGenerativeCalls,

  createToolSignature,

  hasExecutedTool,

  recordToolSuccess,

  recordToolFailure,

  completeAgentState,

  failAgentState,

} from "./agentState.js";

import type {

  AgentState,

  PendingToolApproval,

} from "./agentState.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

// =====================================
// CUSTOM ENGINE ERROR
// =====================================

export class AgentEngineError extends Error {

  constructor(

    message: string,

    public statusCode: number

  ) {

    super(message);

    this.name = "AgentEngineError";

  }

}

// =====================================
// SAFE ERROR MESSAGE
// =====================================

const getSafeErrorMessage = (

  error: unknown

): string => {

  if (

    error instanceof AgentEngineError ||

    error instanceof AgentPlannerError ||

    error instanceof AgentToolError

  ) {

    return redactPersonalInformation(

      error.message

    ).slice(0, 1000);

  }

  console.warn(

    "Agent operation failed:",

    error instanceof Error

      ? error.name

      : "Unknown error"

  );

  return "The requested operation could not be completed.";

};

// =====================================
// CHECK EXECUTION TIME BUDGET
// =====================================

const hasTimeBudget = (

  state: AgentState,

  invocationStartedAt: number

): boolean => {

  const elapsed =
    state.activeExecutionTimeMs +
    Date.now() -
    invocationStartedAt;

  return (

    elapsed <
    AGENT_CONFIG.maxExecutionTimeMs

  );

};

// =====================================
// VALIDATE EXECUTION BUDGET
// =====================================

const ensureToolBudget = (

  state: AgentState,

  toolName: AgentToolName

): void => {

  const tool = getAgentTool(toolName);

  if (
    getRemainingToolCalls(state) === 0
  ) {

    throw new AgentEngineError(

      "Agent tool execution limit reached",

      409

    );

  }

  if (

    tool.usesExternalAI &&

    getRemainingGenerativeCalls(
      state
    ) === 0

  ) {

    throw new AgentEngineError(

      "Generative tool execution limit reached",

      409

    );

  }

  const previousCalls =
    state.executionSteps.filter(

      (step) =>

        step.toolName === toolName &&

        (

          step.status === "completed" ||

          step.status === "failed" ||

          step.status === "running"

        )

    ).length;

  if (

    previousCalls >=
      AGENT_CONFIG.maxCallsPerTool

  ) {

    throw new AgentEngineError(

      "Maximum executions for this tool reached",

      409

    );

  }

};

// =====================================
// PREPARE EXECUTION STEP
// =====================================

const createExecutionStep = (

  state: AgentState,

  toolName: AgentToolName,

  purpose: string

): AgentExecutionStep => {

  const step: AgentExecutionStep = {

    stepNumber:
      state.executionSteps.length + 1,

    toolName,

    purpose:
      purpose.slice(0, 500),

    status: "pending",

    startedAt:
      new Date().toISOString(),

    completedAt: null,

    durationMs: 0,

    resultSummary: null,

    errorMessage: null,

  };

  state.executionSteps.push(step);

  return step;

};

// =====================================
// VALIDATE AND NORMALIZE ARGUMENTS
// =====================================

const prepareArguments = (

  toolName: AgentToolName,

  input: unknown

): Record<string, unknown> => {

  const validated = {

    ...validateToolArguments(

      toolName,

      input

    ) as Record<string, unknown>,

  };

  // Normalize MongoDB resource IDs to
  // avoid case-based duplicate calls.

  for (
    const field of [

      "resumeId",

      "analysisId",

      "jobMatchId",

      "roadmapId",

    ]
  ) {

    const value = validated[field];

    if (typeof value === "string") {

      validated[field] =
        value.toLowerCase();

    }

  }

  return validated;

};

// =====================================
// EXECUTE ONE TOOL
// =====================================

const runTool = async (

  state: AgentState,

  step: AgentExecutionStep,

  args: Record<string, unknown>,

  approved: boolean

): Promise<void> => {

  const tool =
    getAgentTool(step.toolName);

  ensureToolBudget(

    state,

    step.toolName

  );

  const signature =
    createToolSignature(

      step.toolName,

      args

    );

  if (

    AGENT_CONFIG.preventDuplicateToolCalls &&

    hasExecutedTool(

      state,

      signature

    )

  ) {

    step.status = "skipped";

    step.completedAt =
      new Date().toISOString();

    step.resultSummary =
      "An identical tool call has already been attempted.";

    state.observations.push({

      stepNumber: step.stepNumber,

      toolName: step.toolName,

      success: false,

      summary: step.resultSummary,

      data: {},

    });

    return;

  }

  // Count every attempted operation,
  // including unsuccessful operations.

  state.totalToolCalls++;

  if (tool.usesExternalAI) {

    state.generativeToolCalls++;

  }

  state.executedToolSignatures.push(
    signature
  );

  state.status = "executing";

  step.status = "running";

  step.startedAt =
    new Date().toISOString();

  try {

    const result =
      await executeAgentTool(

        step.toolName,

        args,

        state.context,

        approved

      );

    if (!result.success) {

      throw new AgentToolError(

        "Tool execution was unsuccessful",

        502

      );

    }

    recordToolSuccess(

      state,

      step,

      result

    );

  } catch (error) {

    recordToolFailure(

      state,

      step,

      getSafeErrorMessage(error)

    );

  }

};

// =====================================
// BUILD PARTIAL RESULT
// =====================================

const buildPartialResponse = (

  state: AgentState,

  reason: string

): AgentResponse => {

  const successfulSteps =
    state.executionSteps.filter(

      (step) =>
        step.status === "completed"

    );

  const summary =

    successfulSteps.length > 0

      ? [

          "The agent completed the following operations:",

          ...successfulSteps.map(

            (step) =>

              step.resultSummary ||

              step.purpose

          ),

          reason,

        ].join("\n")

      : reason;

  return {

    summary:
      summary.slice(0, 5000),

    recommendations: [

      "Review the completed operations and available reports.",

      "Start a focused agent request for any remaining tasks.",

    ],

    limitations: [reason],

    artifacts:
      state.artifacts.slice(

        0,

        AGENT_CONFIG.maxArtifacts

      ),

  };

};

// =====================================
// STOP BOUNDED EXECUTION
// =====================================

const stopWithPartialResult = (

  state: AgentState,

  reason: string

): AgentState => {

  if (

    state.executionSteps.some(

      (step) =>
        step.status === "completed"

    )

  ) {

    completeAgentState(

      state,

      buildPartialResponse(

        state,

        reason

      )

    );

  } else {

    failAgentState(

      state,

      reason

    );

  }

  return state;

};

// =====================================
// MAIN PLANNING-EXECUTION LOOP
// =====================================

const runAgentLoop = async (

  state: AgentState,

  invocationStartedAt: number

): Promise<AgentState> => {

  while (

    state.iteration <
      AGENT_CONFIG.maxIterations

  ) {

    // ---------------------------------
    // CHECK TIME BUDGET
    // ---------------------------------

    if (

      !hasTimeBudget(

        state,

        invocationStartedAt

      )

    ) {

      return stopWithPartialResult(

        state,

        "The agent reached its execution time budget. Some requested operations may remain incomplete."

      );

    }

    // ---------------------------------
    // CHECK FAILURE LIMIT
    // ---------------------------------

    if (

      state.consecutiveToolFailures >=

      AGENT_CONFIG.maxConsecutiveToolFailures

    ) {

      return stopWithPartialResult(

        state,

        "The agent stopped after consecutive tool execution failures."

      );

    }

    state.status = "planning";

    state.iteration++;

    // ---------------------------------
    // REQUEST NEXT AI DECISION
    // ---------------------------------

    let planningResult;

    try {

      planningResult =
        await planAgentAction({

          context:
            state.context,

          observations:
            state.observations,

          executionSteps:
            state.executionSteps,

          artifacts:
            state.artifacts,

          iteration:
            state.iteration,

          remainingToolCalls:
            getRemainingToolCalls(state),

          remainingGenerativeToolCalls:
            getRemainingGenerativeCalls(
              state
            ),

        });

    } catch (error) {

      return stopWithPartialResult(

        state,

        getSafeErrorMessage(error)

      );

    }

    state.provider =
      planningResult.provider;

    state.modelUsed =
      planningResult.model;

    state.promptVersion =
      planningResult.promptVersion;

    const decision =
      planningResult.decision;

    // ---------------------------------
    // DECISION 1: FINISH
    // ---------------------------------

    if (decision.action === "finish") {

      completeAgentState(

        state,

        {

          summary:
            decision.summary,

          recommendations:
            decision.recommendations,

          limitations:
            decision.limitations,

          // Artifact references originate
          // from successful tools, not AI.

          artifacts:
            state.artifacts.slice(

              0,

              AGENT_CONFIG.maxArtifacts

            ),

        }

      );

      return state;

    }

    // ---------------------------------
    // DECISION 2: REQUEST INPUT
    // ---------------------------------

    if (

      decision.action ===
      "request_input"

    ) {

      state.clarification = {

        question:
          decision.question,

        missingFields:
          decision.missingFields,

      };

      completeAgentState(

        state,

        {

          summary:
            decision.question,

          recommendations: [],

          limitations: [

            "Additional information is required before the requested goal can be completed.",

          ],

          artifacts:
            state.artifacts,

        }

      );

      // Preserve clarification details
      // after completing the current run.

      state.clarification = {

        question:
          decision.question,

        missingFields:
          decision.missingFields,

      };

      return state;

    }

    // ---------------------------------
    // DECISION 3: EXECUTE TOOL
    // ---------------------------------

    if (

      decision.action ===
      "execute_tool"

    ) {

      if (

        !hasTimeBudget(

          state,

          invocationStartedAt

        )

      ) {

        return stopWithPartialResult(

          state,

          "The agent reached its execution time budget before executing another tool."

        );

      }

      let args: Record<string, unknown>;

      try {

        ensureToolBudget(

          state,

          decision.toolName

        );

        args = prepareArguments(

          decision.toolName,

          decision.arguments

        );

      } catch (error) {

        return stopWithPartialResult(

          state,

          getSafeErrorMessage(error)

        );

      }

      const tool =
        getAgentTool(
          decision.toolName
        );

      const signature =
        createToolSignature(

          decision.toolName,

          args

        );

      const step =
        createExecutionStep(

          state,

          decision.toolName,

          decision.purpose

        );

      // ---------------------------------
      // DUPLICATE CALL PREVENTION
      // ---------------------------------

      if (

        AGENT_CONFIG.preventDuplicateToolCalls &&

        hasExecutedTool(

          state,

          signature

        )

      ) {

        step.status = "skipped";

        step.completedAt =
          new Date().toISOString();

        step.resultSummary =
          "Duplicate tool execution prevented.";

        state.observations.push({

          stepNumber:
            step.stepNumber,

          toolName:
            step.toolName,

          success: false,

          summary:
            step.resultSummary,

          data: {},

        });

        continue;

      }

      // ---------------------------------
      // HUMAN-IN-THE-LOOP APPROVAL
      // ---------------------------------

      if (tool.requiresApproval) {

        const approval:
          PendingToolApproval = {

            stepNumber:
              step.stepNumber,

            toolName:
              step.toolName,

            arguments:
              args,

            purpose:
              step.purpose,

            requestedAt:
              new Date().toISOString(),

          };

        state.pendingApproval =
          approval;

        state.status =
          "awaiting_approval";

        console.log(

          "Agent awaiting user approval:",

          decision.toolName

        );

        // Return immediately.
        // No creation tool has run yet.

        return state;

      }

      // ---------------------------------
      // EXECUTE READ-ONLY TOOL
      // ---------------------------------

      await runTool(

        state,

        step,

        args,

        false

      );

    }

  }

  return stopWithPartialResult(

    state,

    "The agent reached its maximum planning iteration limit."

  );

};

// =====================================
// TRACK ACTIVE EXECUTION TIME
// =====================================

const runWithTimeTracking = async (

  state: AgentState,

  callback: (

    invocationStartedAt: number

  ) => Promise<AgentState>

): Promise<AgentState> => {

  const invocationStartedAt =
    Date.now();

  try {

    return await callback(

      invocationStartedAt

    );

  } finally {

    state.activeExecutionTimeMs +=

      Date.now() -
      invocationStartedAt;

  }

};

// =====================================
// START A NEW AGENT RUN
// =====================================

export const startAgentExecution = async (

  userId: string,

  input: unknown

): Promise<AgentState> => {

  if (

    !mongoose.isValidObjectId(userId)

  ) {

    throw new AgentEngineError(

      "Invalid authenticated user",

      401

    );

  }

  const validation =
    agentRequestSchema.safeParse(
      input
    );

  if (!validation.success) {

    throw new AgentEngineError(

      validation.error.issues[0]?.message ||

      "Invalid agent request",

      400

    );

  }

  const state = createAgentState(

    userId,

    validation.data

  );

  console.log(
    "Starting CareerLens AI agent"
  );

  return runWithTimeTracking(

    state,

    (startedAt) =>

      runAgentLoop(

        state,

        startedAt

      )

  );

};

// =====================================
// RESUME AFTER USER APPROVAL
// =====================================

export const resumeAgentExecution = async (

  userId: string,

  state: AgentState,

  input: unknown

): Promise<AgentState> => {

  // State must come from trusted backend
  // persistence, never from request.body.

  if (

    !mongoose.isValidObjectId(userId) ||

    state.context.userId.toLowerCase() !==
      userId.toLowerCase()

  ) {

    throw new AgentEngineError(

      "Agent session not found",

      404

    );

  }

  const validation =
    agentApprovalSchema.safeParse(
      input
    );

  if (!validation.success) {

    throw new AgentEngineError(

      "Invalid agent approval request",

      400

    );

  }

  if (

    state.status !==
      "awaiting_approval" ||

    !state.pendingApproval

  ) {

    throw new AgentEngineError(

      "No pending tool approval is available",

      409

    );

  }

  const {

    stepNumber,

    approved,

  } = validation.data;

  const pending =
    state.pendingApproval;

  if (

    pending.stepNumber !==
    stepNumber

  ) {

    throw new AgentEngineError(

      "Approval does not match the pending tool action",

      409

    );

  }

  const step =
    state.executionSteps.find(

      (item) =>

        item.stepNumber ===
        stepNumber

    );

  if (

    !step ||

    step.status !== "pending" ||

    step.toolName !== pending.toolName

  ) {

    throw new AgentEngineError(

      "Invalid pending execution step",

      409

    );

  }

  return runWithTimeTracking(

    state,

    async (startedAt) => {

      if (

        !hasTimeBudget(

          state,

          startedAt

        )

      ) {

        step.status = "skipped";

        step.completedAt =
          new Date().toISOString();

        step.resultSummary =
          "Execution time budget exhausted.";

        state.pendingApproval = null;

        return stopWithPartialResult(

          state,

          "The agent execution time budget has been exhausted."

        );

      }

      state.pendingApproval = null;

      // ---------------------------------
      // APPROVAL DECLINED
      // ---------------------------------

      if (!approved) {

        step.status = "skipped";

        step.completedAt =
          new Date().toISOString();

        step.resultSummary =
          "The user declined the proposed operation.";

        state.observations.push({

          stepNumber:
            step.stepNumber,

          toolName:
            step.toolName,

          success: false,

          summary:
            step.resultSummary,

          data: {},

        });

        // Stop instead of repeatedly
        // requesting the declined action.

        return stopWithPartialResult(

          state,

          "The proposed creation operation was declined by the user."

        );

      }

      // ---------------------------------
      // APPROVAL GRANTED
      // ---------------------------------

      console.log(

        "User approved agent tool:",

        pending.toolName

      );

      try {

        const args =
          prepareArguments(

            pending.toolName,

            pending.arguments

          );

        await runTool(

          state,

          step,

          args,

          true

        );

      } catch (error) {

        recordToolFailure(

          state,

          step,

          getSafeErrorMessage(error)

        );

      }

      return runAgentLoop(

        state,

        startedAt

      );

    }

  );

};
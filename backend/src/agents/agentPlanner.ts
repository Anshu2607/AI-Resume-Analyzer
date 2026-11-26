import {
  AGENT_CONFIG,
} from "../config/agent.config.js";

import {
  agentDecisionSchema,
} from "../validators/agent.validator.js";

import type {
  AgentDecision,
} from "../validators/agent.validator.js";

import {
  AGENT_SYSTEM_PROMPT,
  AGENT_PROMPT_VERSION,
  buildAgentPlanningPrompt,
} from "../prompts/agent.prompt.js";

import type {
  AgentPlanningInput,
} from "../prompts/agent.prompt.js";

import {
  getAgentTool,
  validateToolArguments,
  AgentToolError,
} from "./agentToolRegistry.js";

import {
  generateLLMResponse,
  LLMError,
} from "../services/llm.service.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

// =====================================
// CUSTOM PLANNER ERROR
// =====================================

export class AgentPlannerError extends Error {

  constructor(

    message: string,

    public statusCode: number

  ) {

    super(message);

    this.name = "AgentPlannerError";

  }

}

// =====================================
// PLANNER RESULT
// =====================================

export interface AgentPlanningResult {

  decision: AgentDecision;

  provider: "groq" | "gemini";

  model: string;

  promptVersion: string;

  processingTime: number;

}

// =====================================
// VALIDATE PLANNING INPUT
// =====================================

const validatePlanningInput = (

  input: AgentPlanningInput

): void => {

  if (
    input.context.request.consent !== true
  ) {

    throw new AgentPlannerError(

      "External AI processing consent is required",

      403

    );

  }

  if (

    !Number.isInteger(input.iteration) ||

    input.iteration < 1 ||

    input.iteration >
      AGENT_CONFIG.maxIterations

  ) {

    throw new AgentPlannerError(

      "Agent planning iteration limit reached",

      409

    );

  }

  if (

    !Number.isInteger(
      input.remainingToolCalls
    ) ||

    input.remainingToolCalls < 0 ||

    input.remainingToolCalls >
      AGENT_CONFIG.maxToolCalls

  ) {

    throw new AgentPlannerError(

      "Invalid remaining tool call budget",

      400

    );

  }

  if (

    !Number.isInteger(
      input.remainingGenerativeToolCalls
    ) ||

    input.remainingGenerativeToolCalls < 0 ||

    input.remainingGenerativeToolCalls >
      AGENT_CONFIG.maxGenerativeToolCalls

  ) {

    throw new AgentPlannerError(

      "Invalid generative tool call budget",

      400

    );

  }

};

// =====================================
// VALIDATE RESOURCE SCOPE
// =====================================

const validateResourceArguments = (

  args: Record<string, unknown>,

  input: AgentPlanningInput

): string[] => {

  const errors: string[] = [];

  const resourceMappings = {

    resumeId:
      input.context.availableResources.resumeIds,

    analysisId:
      input.context.availableResources.analysisIds,

    jobMatchId:
      input.context.availableResources.jobMatchIds,

    roadmapId:
      input.context.availableResources.roadmapIds,

  };

  for (

    const [field, allowedIds] of
      Object.entries(resourceMappings)

  ) {

    const value = args[field];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== "string") {

      errors.push(
        `Invalid resource argument: ${field}`
      );

      continue;

    }

    const authorized = allowedIds.some(

      (id) =>
        id.toLowerCase() ===
        value.toLowerCase()

    );

    if (!authorized) {

      errors.push(

        `Resource ${field} is outside the authorized scope`

      );

    }

  }

  return errors;

};

// =====================================
// VALIDATE AGENT DECISION
// =====================================

const validateDecision = (

  decision: AgentDecision,

  input: AgentPlanningInput

): string[] => {

  const errors: string[] = [];

  // Final responses and clarification
  // requests do not execute tools.

  if (decision.action !== "execute_tool") {

    return errors;

  }

  if (input.remainingToolCalls === 0) {

    errors.push(
      "No remaining tool calls are available"
    );

    return errors;

  }

  try {

    const tool =
      getAgentTool(decision.toolName);

    if (

      tool.usesExternalAI &&

      input.remainingGenerativeToolCalls === 0

    ) {

      errors.push(
        "Generative tool call budget is exhausted"
      );

    }

    const validatedArguments =
      validateToolArguments(

        decision.toolName,

        decision.arguments

      ) as Record<string, unknown>;

    errors.push(

      ...validateResourceArguments(

        validatedArguments,

        input

      )

    );

    // Limit repeated execution of each tool.

    const previousToolCalls =
      input.executionSteps.filter(

        (step) =>

          step.toolName ===
            decision.toolName &&

          (

            step.status === "completed" ||

            step.status === "failed" ||

            step.status === "running"

          )

      ).length;

    if (

      previousToolCalls >=
      AGENT_CONFIG.maxCallsPerTool

    ) {

      errors.push(

        `Execution limit reached for ${decision.toolName}`

      );

    }

    // Job matching must use information
    // explicitly supplied by the user.

    if (

      decision.toolName ===
      "generate_job_match"

    ) {

      if (
        !input.context.request.jobTitle
      ) {

        errors.push(
          "The user must provide a job title"
        );

      }

      if (
        !input.context.request.jobDescription
      ) {

        errors.push(
          "The user must provide a job description"
        );

      }

    }

  } catch (error) {

    if (error instanceof AgentToolError) {

      errors.push(error.message);

    } else {

      errors.push(
        "Unable to validate the selected tool"
      );

    }

  }

  return errors;

};

// =====================================
// SANITIZE USER-FACING DECISION TEXT
// =====================================

const sanitizeDecision = (

  decision: AgentDecision

): AgentDecision => {

  if (decision.action === "execute_tool") {

    return {

      ...decision,

      purpose:
        redactPersonalInformation(
          decision.purpose
        ).slice(0, 500),

    };

  }

  if (decision.action === "request_input") {

    return {

      ...decision,

      question:
        redactPersonalInformation(
          decision.question
        ).slice(0, 1000),

    };

  }

  return {

    ...decision,

    summary:
      redactPersonalInformation(
        decision.summary
      ).slice(0, 5000),

    recommendations:
      decision.recommendations.map(

        (item) =>
          redactPersonalInformation(item)
            .slice(0, 1000)

      ),

    limitations:
      decision.limitations.map(

        (item) =>
          redactPersonalInformation(item)
            .slice(0, 1000)

      ),

  };

};

// =====================================
// MAIN AGENT PLANNING FUNCTION
// =====================================

export const planAgentAction = async (

  input: AgentPlanningInput

): Promise<AgentPlanningResult> => {

  const startTime = Date.now();

  validatePlanningInput(input);

  // Avoid sending unnecessary personal
  // information from the user goal.

  const sanitizedInput:
    AgentPlanningInput = {

      ...input,

      context: {

        ...input.context,

        request: {

          ...input.context.request,

          goal:
            redactPersonalInformation(
              input.context.request.goal
            ),

          jobTitle:
            input.context.request.jobTitle

              ? redactPersonalInformation(
                  input.context.request.jobTitle
                )

              : undefined,

          companyName:
            input.context.request.companyName

              ? redactPersonalInformation(
                  input.context.request.companyName
                )

              : undefined,

        },

      },

    };

  const basePrompt =
    buildAgentPlanningPrompt(
      sanitizedInput
    );

  let correctionInstructions = "";

  // Bounded correction attempts.

  for (

    let attempt = 1;

    attempt <=
      AGENT_CONFIG.maxPlanningAttempts;

    attempt++

  ) {

    console.log(

      "Agent planning iteration:",

      input.iteration

    );

    console.log(

      `Planning attempt ${attempt}/${AGENT_CONFIG.maxPlanningAttempts}`

    );

    let llmResponse;

    try {

      llmResponse =
        await generateLLMResponse({

          systemPrompt:
            AGENT_SYSTEM_PROMPT,

          userPrompt:

            basePrompt +
            correctionInstructions,

        });

    } catch (error) {

      if (error instanceof LLMError) {

        throw new AgentPlannerError(

          error.message,

          error.statusCode

        );

      }

      throw error;

    }

    // =====================================
    // PARSE JSON RESPONSE
    // =====================================

    let parsedResponse: unknown;

    try {

      parsedResponse = JSON.parse(
        llmResponse.content
      );

    } catch {

      console.warn(
        "Agent planning JSON parsing failed"
      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous response was not valid JSON.

Return exactly one complete JSON object
using an allowed decision structure.

`;

      continue;

    }

    // =====================================
    // VALIDATE DECISION SCHEMA
    // =====================================

    const validation =
      agentDecisionSchema.safeParse(
        parsedResponse
      );

    if (!validation.success) {

      const issues =
        validation.error.issues

          .slice(0, 15)

          .map((issue) => ({

            path: issue.path.join("."),

            code: issue.code,

          }));

      console.warn(

        "Agent decision schema validation failed:",

        issues

      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous decision failed schema validation.

Validation issues:

${JSON.stringify(issues)}

Return one complete decision matching
an allowed action type.

`;

      continue;

    }

    // =====================================
    // VALIDATE DECISION CONSTRAINTS
    // =====================================

    const decision = validation.data;

    const constraintErrors =
      validateDecision(

        decision,

        input

      );

    if (constraintErrors.length > 0) {

      console.warn(

        "Agent decision constraint validation failed:",

        constraintErrors

      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous decision violated execution
constraints.

Validation errors:

${JSON.stringify(constraintErrors)}

Select another authorized tool if appropriate.

If essential information is missing,
return request_input.

If no useful tool calls remain,
return finish using available observations.

`;

      continue;

    }

    // =====================================
    // VALIDATE SANITIZED DECISION
    // =====================================

    const sanitizedDecision =
      agentDecisionSchema.safeParse(
        sanitizeDecision(decision)
      );

    if (!sanitizedDecision.success) {

      correctionInstructions = `

CORRECTION REQUIRED:

Return a concise decision with non-empty
required text fields and no personal
contact information.

`;

      continue;

    }

    const processingTime =
      Date.now() - startTime;

    console.log(

      "Agent decision:",

      sanitizedDecision.data.action

    );

    if (
      sanitizedDecision.data.action ===
      "execute_tool"
    ) {

      console.log(

        "Selected tool:",

        sanitizedDecision.data.toolName

      );

    }

    console.log(

      "Planning time:",

      processingTime,

      "ms"

    );

    return {

      decision:
        sanitizedDecision.data,

      provider:
        llmResponse.provider,

      model:
        llmResponse.model,

      promptVersion:
        AGENT_PROMPT_VERSION,

      processingTime,

    };

  }

  throw new AgentPlannerError(

    "AI agent could not produce a valid planning decision after correction",

    502

  );

};
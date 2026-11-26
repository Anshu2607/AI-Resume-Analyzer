import { randomUUID } from "node:crypto";

import {
  INTERVIEW_CONFIG,
  calculateInterviewScore,
} from "../config/interview.config.js";

import {
  generatedQuestionSchema,
  generatedEvaluationSchema,
  interviewQuestionSchema,
  interviewEvaluationSchema,
} from "../validators/interview.validator.js";

import type {
  InterviewQuestion,
  InterviewEvaluation,
} from "../validators/interview.validator.js";

import {
  INTERVIEW_QUESTION_SYSTEM_PROMPT,
  QUESTION_PROMPT_VERSION,
  buildInterviewQuestionPrompt,
} from "../prompts/interviewQuestion.prompt.js";

import type {
  QuestionGenerationInput,
} from "../prompts/interviewQuestion.prompt.js";

import {
  INTERVIEW_EVALUATION_SYSTEM_PROMPT,
  EVALUATION_PROMPT_VERSION,
  buildInterviewEvaluationPrompt,
} from "../prompts/interviewEvaluation.prompt.js";

import type {
  AnswerEvaluationInput,
} from "../prompts/interviewEvaluation.prompt.js";

import {
  isDuplicateInterviewQuestion,
} from "../utils/interviewAdaptive.utils.js";

import {
  generateLLMResponse,
  LLMError,
} from "./llm.service.js";

// =====================================
// CUSTOM INTERVIEW ERROR
// =====================================

export class InterviewAIError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "InterviewAIError";
  }
}

// =====================================
// GENERATION RESULT
// =====================================

export interface QuestionGenerationResult {
  question: InterviewQuestion;

  provider: "groq" | "gemini";

  modelUsed: string;

  promptVersion: string;

  processingTime: number;
}

// =====================================
// PARSE AI JSON RESPONSE
// =====================================

const parseAIResponse = (
  content: string
): unknown => {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
};

// =====================================
// VALIDATE QUESTION GENERATION INPUT
// =====================================

const validateQuestionInput = (
  input: QuestionGenerationInput
): void => {
  if (
    !Number.isInteger(input.totalQuestions) ||
    input.totalQuestions <
      INTERVIEW_CONFIG.minQuestions ||
    input.totalQuestions >
      INTERVIEW_CONFIG.maxQuestions
  ) {
    throw new InterviewAIError(
      "Invalid interview question limit",
      400
    );
  }

  if (
    !Number.isInteger(input.questionNumber) ||
    input.questionNumber < 1 ||
    input.questionNumber >
      input.totalQuestions
  ) {
    throw new InterviewAIError(
      "Invalid interview question number",
      400
    );
  }

  if (
    input.questionNumber !==
    input.previousQuestions.length + 1
  ) {
    throw new InterviewAIError(
      "Invalid interview question sequence",
      409
    );
  }

  if (
    input.previousQuestions.length !==
    input.previousAnswers.length
  ) {
    throw new InterviewAIError(
      "Complete the current question before generating another",
      409
    );
  }

  const answeredIds = new Set(
    input.previousAnswers.map(
      (answer) => answer.questionId
    )
  );

  if (
    answeredIds.size !==
      input.previousAnswers.length ||
    input.previousQuestions.some(
      (question) =>
        !answeredIds.has(question.questionId)
    )
  ) {
    throw new InterviewAIError(
      "Invalid interview answer history",
      409
    );
  }

  if (
    input.interviewType === "resume_based" &&
    !input.resumeContext?.trim()
  ) {
    throw new InterviewAIError(
      "Resume context is required",
      422
    );
  }

  if (
    input.interviewType === "job_specific" &&
    !input.jobContext?.trim()
  ) {
    throw new InterviewAIError(
      "Job context is required",
      422
    );
  }

  if (input.isFollowUp) {
    const parentQuestion =
      input.previousQuestions[
        input.previousQuestions.length - 1
      ];

    const parentAnswer =
      input.previousAnswers.find(
        (answer) =>
          answer.questionId ===
          input.parentQuestionId
      );

    if (
      !parentQuestion ||
      parentQuestion.questionId !==
        input.parentQuestionId ||
      !parentAnswer ||
      parentAnswer.status !== "answered" ||
      !parentAnswer.evaluation ||
      !input.followUpFocus?.trim()
    ) {
      throw new InterviewAIError(
        "Invalid follow-up question context",
        400
      );
    }

    if (
      parentQuestion.difficulty !==
      input.difficulty
    ) {
      throw new InterviewAIError(
        "Follow-up difficulty must match its parent question",
        400
      );
    }
  } else if (
    input.parentQuestionId !== null ||
    input.followUpFocus !== null
  ) {
    throw new InterviewAIError(
      "Independent questions cannot contain follow-up metadata",
      400
    );
  }
};

// =====================================
// QUESTION CATEGORY VALIDATION
// =====================================

const isCategoryAllowed = (
  interviewType: QuestionGenerationInput["interviewType"],
  category: InterviewQuestion["category"]
): boolean => {
  switch (interviewType) {
    case "technical":
      return [
        "technical",
        "conceptual",
        "scenario_based",
        "problem_solving",
        "project_based",
        "system_design",
      ].includes(category);

    case "hr":
      return [
        "hr",
        "behavioral",
        "scenario_based",
      ].includes(category);

    case "behavioral":
      return [
        "behavioral",
        "hr",
        "scenario_based",
      ].includes(category);

    case "resume_based":
      return [
        "resume_based",
        "project_based",
        "technical",
        "conceptual",
        "scenario_based",
        "behavioral",
        "system_design",
        "problem_solving",
      ].includes(category);

    case "job_specific":
    case "mixed":
      return true;

    default:
      return false;
  }
};

// =====================================
// GENERATE INTERVIEW QUESTION
// =====================================

export const generateInterviewQuestion = async (
  input: QuestionGenerationInput
): Promise<QuestionGenerationResult> => {
  validateQuestionInput(input);

  const startedAt = Date.now();

  const basePrompt =
    buildInterviewQuestionPrompt(input);

  let correctionInstructions = "";

  for (
    let attempt = 1;
    attempt <=
    INTERVIEW_CONFIG.maxGenerationAttempts;
    attempt++
  ) {
    console.log(
      `Generating interview question ${input.questionNumber}, attempt ${attempt}`
    );

    let response;

    try {
      response = await generateLLMResponse({
        systemPrompt:
          INTERVIEW_QUESTION_SYSTEM_PROMPT,

        userPrompt:
          basePrompt + correctionInstructions,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        throw new InterviewAIError(
          "AI question generation is currently unavailable",
          error.statusCode
        );
      }

      throw error;
    }

    // Parse JSON

    let parsed: unknown;

    try {
      parsed = parseAIResponse(
        response.content
      );
    } catch {
      correctionInstructions = `

CORRECTION REQUIRED:

The previous response contained invalid JSON.

Return one complete JSON object matching
the required question structure.

`;

      continue;
    }

    // Validate generated question

    const validation =
      generatedQuestionSchema.safeParse(parsed);

    if (!validation.success) {
      const issues =
        validation.error.issues.map(
          (issue) => ({
            field: issue.path.join("."),
            code: issue.code,
          })
        );

      console.warn(
        "Interview question validation failed:",
        issues
      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous question failed validation.

Validation issues:

${JSON.stringify(issues)}

Return a complete and valid question object.

`;

      continue;
    }

    const generated = validation.data;

    // Validate question category

    if (
      !isCategoryAllowed(
        input.interviewType,
        generated.category
      )
    ) {
      correctionInstructions = `

CORRECTION REQUIRED:

The question category does not match
the requested interview type.

Generate a question appropriate for
the ${input.interviewType} interview.

`;

      continue;
    }

    // Prevent duplicate questions

    if (
      isDuplicateInterviewQuestion(
        generated.question,
        input.previousQuestions
      )
    ) {
      console.warn(
        "Duplicate interview question rejected"
      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous generated question was too
similar to an existing interview question.

Generate a different question that assesses
a distinct concept or application.

If this is a follow-up, explore a new aspect
of the parent question.

`;

      continue;
    }

    // Backend-controlled question metadata

    const question =
      interviewQuestionSchema.parse({
        ...generated,

        questionId: randomUUID(),

        questionNumber:
          input.questionNumber,

        difficulty:
          input.difficulty,

        isFollowUp:
          input.isFollowUp,

        parentQuestionId:
          input.parentQuestionId,

        generatedAt:
          new Date().toISOString(),
      });

    const processingTime =
      Date.now() - startedAt;

    console.log(
      "Interview question generated successfully:",
      question.questionNumber,
      question.difficulty,
      question.category
    );

    return {
      question,

      provider: response.provider,

      modelUsed: response.model,

      promptVersion:
        QUESTION_PROMPT_VERSION,

      processingTime,
    };
  }

  throw new InterviewAIError(
    "AI could not generate a valid interview question",
    502
  );
};

// =====================================
// EVALUATE INTERVIEW ANSWER
// =====================================

export const evaluateInterviewAnswer = async (
  input: AnswerEvaluationInput
): Promise<InterviewEvaluation> => {
  const answer =
    input.candidateAnswer.trim();

  if (
    !answer ||
    answer.length >
      INTERVIEW_CONFIG.maxAnswerCharacters
  ) {
    throw new InterviewAIError(
      "Invalid interview answer",
      400
    );
  }

  const startedAt = Date.now();

  const basePrompt =
    buildInterviewEvaluationPrompt({
      ...input,
      candidateAnswer: answer,
    });

  let correctionInstructions = "";

  for (
    let attempt = 1;
    attempt <=
    INTERVIEW_CONFIG.maxEvaluationAttempts;
    attempt++
  ) {
    console.log(
      `Evaluating interview answer ${input.question.questionNumber}, attempt ${attempt}`
    );

    let response;

    try {
      response = await generateLLMResponse({
        systemPrompt:
          INTERVIEW_EVALUATION_SYSTEM_PROMPT,

        userPrompt:
          basePrompt + correctionInstructions,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        throw new InterviewAIError(
          "AI answer evaluation is currently unavailable",
          error.statusCode
        );
      }

      throw error;
    }

    // Parse evaluation JSON

    let parsed: unknown;

    try {
      parsed = parseAIResponse(
        response.content
      );
    } catch {
      correctionInstructions = `

CORRECTION REQUIRED:

The previous evaluation was not valid JSON.

Return exactly one complete evaluation
object using the required structure.

`;

      continue;
    }

    // Validate evaluation dimensions

    const validation =
      generatedEvaluationSchema.safeParse(
        parsed
      );

    if (!validation.success) {
      const issues =
        validation.error.issues.map(
          (issue) => ({
            field: issue.path.join("."),
            code: issue.code,
          })
        );

      console.warn(
        "Interview evaluation validation failed:",
        issues
      );

      correctionInstructions = `

CORRECTION REQUIRED:

The previous evaluation failed validation.

Validation issues:

${JSON.stringify(issues)}

All scores must be numbers between
0 and 100.

Return the required evaluation fields.

Do not include an overallScore field.

Ensure follow-up fields are consistent.

`;

      continue;
    }

    const generated = validation.data;

    // Calculate weighted score on backend

    const overallScore =
      calculateInterviewScore(
        generated.scores
      );

    // Enforce backend follow-up policy

    const allowFollowUp =
      input.enableFollowUps &&
      generated.recommendFollowUp &&
      Boolean(generated.followUpFocus) &&
      overallScore >=
        INTERVIEW_CONFIG.followUpMinScore &&
      overallScore <=
        INTERVIEW_CONFIG.followUpMaxScore;

    const evaluation =
      interviewEvaluationSchema.parse({
        ...generated,

        overallScore,

        recommendFollowUp:
          allowFollowUp,

        followUpFocus:
          allowFollowUp
            ? generated.followUpFocus
            : null,

        provider:
          response.provider,

        modelUsed:
          response.model,

        promptVersion:
          EVALUATION_PROMPT_VERSION,

        processingTime:
          Date.now() - startedAt,

        evaluatedAt:
          new Date().toISOString(),
      });

    console.log(
      "Interview answer evaluated successfully:",
      input.question.questionNumber,
      "Score:",
      evaluation.overallScore
    );

    return evaluation;
  }

  throw new InterviewAIError(
    "AI could not produce a valid answer evaluation",
    502
  );
};

// =====================================
// PUBLIC QUESTION PROJECTION
// =====================================

// Never expose expected answers or
// grading key points before submission.

export const getPublicInterviewQuestion = (
  question: InterviewQuestion
) => {
  return {
    questionId:
      question.questionId,

    questionNumber:
      question.questionNumber,

    question:
      question.question,

    category:
      question.category,

    topic:
      question.topic,

    difficulty:
      question.difficulty,

    isFollowUp:
      question.isFollowUp,

    parentQuestionId:
      question.parentQuestionId,

    generatedAt:
      question.generatedAt,
  };
};
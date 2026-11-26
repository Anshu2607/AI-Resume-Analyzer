import {
  semanticSearch,
  VectorSearchError,
} from "./vectorSearch.service.js";

import {
  generateLLMResponse,
  LLMError,
} from "./llm.service.js";

import {
  ragQuerySchema,
  ragResponseSchema,
} from "../validators/rag.validator.js";

import {
  RAG_SYSTEM_PROMPT,
  RAG_PROMPT_VERSION,
  buildRAGPrompt,
} from "../prompts/rag.prompt.js";

import {
  buildRetrievedContext,
  validateSourceEvidence,
} from "../utils/context.utils.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

import {
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

// =====================================
// RAG ERROR
// =====================================

export class RAGError extends Error {

  constructor(
    message: string,
    public statusCode: number
  ) {

    super(message);

    this.name = "RAGError";

  }
}

// =====================================
// RAG INPUT
// =====================================

interface RAGInput {

  userId: string;

  resumeId: string;

  question: string;

  limit?: number;

}

// =====================================
// GENERATION CONFIGURATION
// =====================================

// Initial generation + one correction attempt.

const MAX_RAG_ATTEMPTS = 2;

// =====================================
// GENERATE EVIDENCE-GROUNDED ANSWER
// =====================================

export const askResumeQuestion = async ({
  userId,
  resumeId,
  question,
  limit = 5,
}: RAGInput) => {

  const startTime = Date.now();

  // ===================================
  // VALIDATE INCOMING QUESTION
  // ===================================

  const validation = ragQuerySchema.safeParse({

    question,

    limit,

  });

  if (!validation.success) {

    throw new RAGError(

      validation.error.issues[0]?.message ||
        "Invalid RAG request",

      400

    );

  }

  const validatedQuestion =
    validation.data.question;

  const sanitizedQuestion =
    redactPersonalInformation(
      validatedQuestion
    );

  if (!sanitizedQuestion.trim()) {

    throw new RAGError(

      "Question cannot be empty",

      400

    );

  }

  console.log("Starting RAG pipeline");

  // ===================================
  // RETRIEVE RELEVANT DOCUMENT CHUNKS
  // ===================================

  let retrieval;

  try {

    retrieval = await semanticSearch({

      userId,

      resumeId,

      query: sanitizedQuestion,

      limit: validation.data.limit,

    });

  } catch (error) {

    if (error instanceof VectorSearchError) {

      throw new RAGError(

        error.message,

        error.statusCode

      );

    }

    throw error;

  }

  console.log(

    "Retrieved chunks:",

    retrieval.results.length

  );

  // ===================================
  // BUILD RETRIEVED CONTEXT
  // ===================================

  const sources = buildRetrievedContext(
    retrieval.results
  );

  // Avoid unnecessary LLM calls when
  // supporting context is unavailable.

  if (sources.length === 0) {

    return {

      resumeId,

      question: validatedQuestion,

      answer:
        "I could not retrieve supporting resume information for this question. Please ensure the resume is indexed and try again.",

      supportingEvidence: [],

      confidence: "low",

      insufficientContext: true,

      followUpQuestions: [],

      sources: [],

      modelUsed: null,

      provider: null,

      promptVersion: RAG_PROMPT_VERSION,

      retrievalTime:
        retrieval.processingTime,

      processingTime:
        Date.now() - startTime,

    };

  }

  // ===================================
  // CONSTRUCT AUGMENTED PROMPT
  // ===================================

  const originalPrompt = buildRAGPrompt(

    sanitizedQuestion,

    sources

  );

  let correctionInstruction = "";

  // ===================================
  // GENERATE AND VERIFY RESPONSE
  // ===================================

  for (

    let attempt = 1;

    attempt <= MAX_RAG_ATTEMPTS;

    attempt++

  ) {

    console.log(

      "RAG generation attempt:",

      attempt

    );

    const prompt = correctionInstruction

      ? `${originalPrompt}\n\n${correctionInstruction}`

      : originalPrompt;

    // =================================
    // GENERATE LLM RESPONSE
    // =================================

    const llmResponse =
      await generateLLMResponse({

        systemPrompt: RAG_SYSTEM_PROMPT,

        userPrompt: prompt,

        // Explicit quota and analytics attribution.

        userId,

        feature:
          AI_USAGE_FEATURES.RAG_ASSISTANT,

      }).catch((error: unknown) => {

        // Preserve provider and quota errors.
        // HTTP 429 must not trigger citation retries.

        if (error instanceof LLMError) {

          throw new RAGError(

            error.message,

            error.statusCode

          );

        }

        throw error;

      });

    // =================================
    // PARSE AI-GENERATED JSON
    // =================================

    let parsedResponse: unknown;

    try {

      parsedResponse = JSON.parse(
        llmResponse.content
      );

    } catch {

      if (attempt < MAX_RAG_ATTEMPTS) {

        correctionInstruction = `
The previous response was not valid JSON.

Generate a new response using the exact required JSON structure.
Do not include Markdown code fences or additional text.
`;

        continue;

      }

      throw new RAGError(

        "AI returned an invalid response format",

        502

      );

    }

    // =================================
    // VALIDATE RESPONSE STRUCTURE
    // =================================

    const responseValidation =
      ragResponseSchema.safeParse(
        parsedResponse
      );

    if (!responseValidation.success) {

      console.error(

        "RAG response validation failed:",

        responseValidation.error.issues.map(
          (issue) => ({

            path: issue.path.join("."),

            code: issue.code,

          })
        )

      );

      if (attempt < MAX_RAG_ATTEMPTS) {

        correctionInstruction = `
The previous response did not match the required structure.

Return all required JSON fields with the correct data types.
Use only valid confidence values: high, medium or low.
`;

        continue;

      }

      throw new RAGError(

        "AI response did not meet the required structure",

        502

      );

    }

    const result =
      responseValidation.data;

    // =================================
    // VERIFY CITATIONS
    // =================================

    const verifiedEvidence =
      result.supportingEvidence.filter(

        (item) =>
          validateSourceEvidence(

            item.sourceId,

            item.evidence,

            sources

          )

      );

    const invalidCitationCount =

      result.supportingEvidence.length -

      verifiedEvidence.length;

    console.log(

      "Verified citations:",

      verifiedEvidence.length

    );

    console.log(

      "Invalid citations:",

      invalidCitationCount

    );

    // =================================
    // CORRECT INVALID CITATIONS
    // =================================

    if (invalidCitationCount > 0) {

      if (attempt < MAX_RAG_ATTEMPTS) {

        const availableSourceIds =
          sources.map(
            (source) => source.sourceId
          );

        correctionInstruction = `
The previous response contained ${invalidCitationCount}
unverifiable supporting citations.

Generate a completely new answer using these rules:

1. Valid source identifiers are:
${JSON.stringify(availableSourceIds)}

2. Copy evidence directly from the corresponding
   source content.

3. Each evidence value must be a single continuous
   exact excerpt.

4. Do not paraphrase or combine evidence.

5. If reliable evidence cannot be found, state that
   the available information is insufficient.

6. Return only the required JSON object.
`;

        console.warn(

          "Retrying RAG response with citation correction"

        );

        continue;

      }

      // Never return unverifiable evidence.

      throw new RAGError(

        "AI answer contained unverifiable citations. Please try again.",

        502

      );

    }

    // =================================
    // REQUIRE SUPPORTING EVIDENCE
    // =================================

    if (

      !result.insufficientContext &&

      verifiedEvidence.length === 0

    ) {

      if (attempt < MAX_RAG_ATTEMPTS) {

        correctionInstruction = `
The previous response did not include supporting evidence.

Provide at least one verified source excerpt when answering
questions grounded in the resume.

If the resume does not contain sufficient information,
set insufficientContext to true and confidence to low.

Do not invent supporting evidence.
`;

        continue;

      }

      throw new RAGError(

        "AI answer did not include verifiable supporting evidence",

        502

      );

    }

    // =================================
    // PREPARE VERIFIED RESPONSE
    // =================================

    const confidence =

      verifiedEvidence.length === 0 ||

      result.insufficientContext

        ? "low"

        : result.confidence;

    const processingTime =
      Date.now() - startTime;

    console.log(

      "RAG pipeline completed"

    );

    console.log(

      "Provider:",

      llmResponse.provider

    );

    console.log(

      "Processing time:",

      processingTime,

      "ms"

    );

    return {

      resumeId,

      question: validatedQuestion,

      answer: result.answer,

      supportingEvidence:
        verifiedEvidence,

      confidence,

      insufficientContext:
        result.insufficientContext,

      followUpQuestions:
        result.followUpQuestions,

      sources: sources.map((source) => ({

        sourceId:
          source.sourceId,

        chunkIndex:
          source.chunkIndex,

        score:
          source.score,

        content:
          source.content,

      })),

      modelUsed:
        llmResponse.model,

      provider:
        llmResponse.provider,

      promptVersion:
        RAG_PROMPT_VERSION,

      retrievalTime:
        retrieval.processingTime,

      processingTime,

    };

  }

  // ===================================
  // GENERATION ATTEMPTS EXHAUSTED
  // ===================================

  throw new RAGError(

    "Unable to generate a verified AI response",

    502

  );

};
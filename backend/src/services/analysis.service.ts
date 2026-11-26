import mongoose from "mongoose";

import Resume from "../models/resume.model.js";
import Analysis from "../models/analysis.model.js";

import {
  generateLLMResponse,
  LLMError,
} from "./llm.service.js";

import {
  analysisSchema,
} from "../validators/analysis.validator.js";

import {
  RESUME_SYSTEM_PROMPT,
  buildResumePrompt,
  PROMPT_VERSION,
} from "../prompts/resume.prompt.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

import {
  calculateOverallScore,
  SCORING_VERSION,
} from "../utils/scoring.utils.js";

export class AnalysisError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

// Generate AI-powered resume analysis
export const analyzeResume = async (
  userId: string,
  resumeId: string
) => {

  const startTime = Date.now();

  // Validate resume ID
  if (!mongoose.isValidObjectId(resumeId)) {
    throw new AnalysisError(
      "Invalid resume ID",
      400
    );
  }

  // Retrieve resume and verify ownership
  const resume = await Resume.findOne({
    _id: resumeId,
    userId,
  }).select("+extractedText");

  if (!resume) {
    throw new AnalysisError(
      "Resume not found",
      404
    );
  }

  // Verify processing status
  if (
    resume.status !== "processed" ||
    !resume.extractedText
  ) {
    throw new AnalysisError(
      "Resume is not ready for analysis",
      422
    );
  }

  // Redact personal information
  const sanitizedText =
    redactPersonalInformation(
      resume.extractedText
    );

  if (sanitizedText.length < 30) {
    throw new AnalysisError(
      "Insufficient resume content for analysis",
      422
    );
  }

  if (sanitizedText.length > 50000) {
    throw new AnalysisError(
      "Resume text exceeds the analysis limit",
      422
    );
  }

  console.log(
    "Resume text length:",
    sanitizedText.length
  );

  // Generate AI response through common LLM service
  const llmResponse = await generateLLMResponse({
    systemPrompt: RESUME_SYSTEM_PROMPT,

    userPrompt: buildResumePrompt(
      sanitizedText
    ),
  }).catch((error: unknown) => {

    if (error instanceof LLMError) {
      throw new AnalysisError(
        error.message,
        error.statusCode
      );
    }

    throw error;
  });

  // Parse generated JSON
  let parsedResponse: unknown;

  try {

    parsedResponse = JSON.parse(
      llmResponse.content
    );

  } catch {

    console.error(
      "LLM returned invalid JSON"
    );

    throw new AnalysisError(
      "AI returned an invalid response format",
      502
    );
  }

  // Validate generated response
  const validation =
    analysisSchema.safeParse(
      parsedResponse
    );

  if (!validation.success) {

    console.error(
      "AI response validation failed:",
      validation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      }))
    );

    throw new AnalysisError(
      "AI response did not meet the required structure",
      502
    );
  }

  const result = validation.data;

  // Calculate overall resume quality score
  const overallScore = calculateOverallScore(
    result.assessment
  );

  // Check that resume still exists before saving
  const resumeExists = await Resume.exists({
    _id: resumeId,
    userId,
  });

  if (!resumeExists) {
    throw new AnalysisError(
      "Resume no longer exists",
      404
    );
  }

  // Store AI analysis in MongoDB
  const analysis = await Analysis.create({
    userId,

    resumeId,

    result,

    overallScore,

    modelUsed: llmResponse.model,

    promptVersion: PROMPT_VERSION,

    scoringVersion: SCORING_VERSION,

    processingTime: Date.now() - startTime,
  });

  console.log(
    "AI analysis saved successfully"
  );

  console.log(
    "Provider:",
    llmResponse.provider
  );

  console.log(
    "Model:",
    llmResponse.model
  );

  console.log(
    "Overall score:",
    overallScore
  );

  return analysis;
};

// Retrieve all analysis reports
export const getUserAnalyses = async (
  userId: string
) => {

  return Analysis.find({ userId })
    .select("-__v")
    .sort({ createdAt: -1 })
    .lean();
};

// Retrieve a particular analysis report
export const getAnalysisById = async (
  userId: string,
  analysisId: string
) => {

  if (!mongoose.isValidObjectId(analysisId)) {
    throw new AnalysisError(
      "Invalid analysis ID",
      400
    );
  }

  const analysis = await Analysis.findOne({
    _id: analysisId,
    userId,
  })
    .select("-__v")
    .lean();

  if (!analysis) {
    throw new AnalysisError(
      "Analysis report not found",
      404
    );
  }

  return analysis;
};

// Delete an analysis report
export const deleteAnalysis = async (
  userId: string,
  analysisId: string
) => {

  if (!mongoose.isValidObjectId(analysisId)) {
    throw new AnalysisError(
      "Invalid analysis ID",
      400
    );
  }

  const analysis =
    await Analysis.findOneAndDelete({
      _id: analysisId,
      userId,
    });

  if (!analysis) {
    throw new AnalysisError(
      "Analysis report not found",
      404
    );
  }

  return {
    message: "Analysis deleted successfully",
  };
};
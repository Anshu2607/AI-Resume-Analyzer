import mongoose from "mongoose";

import Resume from "../models/resume.model.js";
import JobMatch from "../models/jobMatch.model.js";

import type {
  IJobMatch,
} from "../models/jobMatch.model.js";

import {
  jobMatchingRequestSchema,
  jobMatchingResponseSchema,
} from "../validators/jobMatching.validator.js";

import type {
  JobMatchingResponse,
} from "../validators/jobMatching.validator.js";

import {
  JOB_MATCHING_SYSTEM_PROMPT,
  JOB_MATCHING_PROMPT_VERSION,
  buildJobMatchingPrompt,
} from "../prompts/jobMatching.prompt.js";

import {
  calculateSemanticSimilarity,
  SimilarityError,
} from "./similarity.service.js";

import {
  calculateJobCompatibility,
} from "../utils/jobMatchingScoring.utils.js";

import {
  generateLLMResponse,
  LLMError,
} from "./llm.service.js";

import {
  getEmbeddingModel,
} from "./embedding.service.js";

import {
  redactPersonalInformation,
} from "../utils/privacy.utils.js";

const MAX_GENERATION_ATTEMPTS = 2;

export class JobMatchingError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "JobMatchingError";
  }
}

// Validate MongoDB identifiers
const validateId = (
  id: string,
  label: string
): void => {
  if (!mongoose.isValidObjectId(id)) {
    throw new JobMatchingError(
      `Invalid ${label}`,
      400
    );
  }
};

// Normalize PDF text and whitespace
const normalizeText = (
  text: string
): string => {
  return text
    .normalize("NFKC")
    .replace(/\u00AD/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Verify AI-generated resume evidence
const verifyEvidence = (
  evidence: string,
  resumeText: string
): boolean => {

  const normalizedEvidence =
    normalizeText(evidence);

  if (!normalizedEvidence) {
    return false;
  }

  return normalizeText(
    resumeText
  ).includes(normalizedEvidence);
};

// Generate and validate AI assessment
const generateValidatedAssessment = async (
  prompt: string,
  resumeText: string
) => {

  let correctionInstructions = "";

  for (
    let attempt = 1;
    attempt <= MAX_GENERATION_ATTEMPTS;
    attempt++
  ) {

    console.log(
      `Job matching generation attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}`
    );

    const systemPrompt = `
${JOB_MATCHING_SYSTEM_PROMPT}

STRICT EVIDENCE REQUIREMENTS:

Every matched skill must have an evidence field
containing a contiguous verbatim excerpt from the
supplied candidate resume.

Copy the exact words and punctuation.

Do not paraphrase, summarize, combine separate
sentences or insert additional words.

Prefer short, precise excerpts that clearly support
the corresponding skill.

If no exact supporting excerpt exists, do not
include that skill in matchedSkills.

A related skill must also have a genuine supporting
resume excerpt.

Never fabricate experience or qualifications.

Return the complete required JSON structure.
`;

    const llmResponse =
      await generateLLMResponse({
        systemPrompt,

        userPrompt:
          prompt + correctionInstructions,
      }).catch((error: unknown) => {

        if (error instanceof LLMError) {
          throw new JobMatchingError(
            error.message,
            error.statusCode
          );
        }

        throw error;
      });

    let parsedResponse: unknown;

    // Parse generated JSON
    try {

      parsedResponse = JSON.parse(
        llmResponse.content
      );

    } catch {

      console.warn(
        "Job matching JSON parsing failed"
      );

      correctionInstructions = `

CORRECTION REQUIRED:

Your previous response was not valid JSON.

Generate the complete response again using
the required JSON structure.

Do not include Markdown code fences.
`;

      continue;
    }

    // Validate response structure
    const validation =
      jobMatchingResponseSchema.safeParse(
        parsedResponse
      );

    if (!validation.success) {

      console.warn(
        "Job matching schema validation failed:",
        validation.error.issues.map(
          (issue) => ({
            path: issue.path.join("."),
            code: issue.code,
          })
        )
      );

      correctionInstructions = `

CORRECTION REQUIRED:

Your previous response did not satisfy
the required JSON schema.

Include every required field and use
the specified data types and enum values.

Return the complete corrected JSON.
`;

      continue;
    }

    const result: JobMatchingResponse =
      validation.data;

    // Verify every matched skill excerpt
    const invalidEvidence =
      result.matchedSkills.filter(
        (item) =>
          !verifyEvidence(
            item.evidence,
            resumeText
          )
      );

    console.log(
      "Verified matched skills:",
      result.matchedSkills.length -
        invalidEvidence.length
    );

    console.log(
      "Invalid matched skill evidence:",
      invalidEvidence.length
    );

    if (invalidEvidence.length === 0) {

      console.log(
        "Job matching evidence validation successful"
      );

      return {
        result,
        provider: llmResponse.provider,
        model: llmResponse.model,
      };
    }

    // Request a corrected assessment
    correctionInstructions = `

CORRECTION REQUIRED:

Your previous assessment contained evidence
excerpts that could not be found verbatim
in the candidate resume.

The following skill names are untrusted data
identifying the entries that failed validation:

${JSON.stringify(
  invalidEvidence.map(
    (item) => item.skill
  )
)}

Re-examine the original resume.

For every matched skill, copy a short,
contiguous excerpt directly from the resume.

Do not rewrite or paraphrase evidence.

If a skill cannot be supported by an exact
resume excerpt, remove it from matchedSkills.

Recalculate the assessment scores, strengths,
gaps and recommendations accordingly.

Return the complete corrected JSON object.
`;

    if (
      attempt < MAX_GENERATION_ATTEMPTS
    ) {

      console.log(
        "Retrying job matching with stricter evidence instructions"
      );

    }
  }

  throw new JobMatchingError(
    "AI could not produce a valid evidence-grounded job matching report after correction. Please try again.",
    502
  );
};

// 1. Generate job matching report
export const matchResumeToJob = async (
  userId: string,
  input: unknown
) => {

  const startTime = Date.now();

  validateId(userId, "user ID");

  // Validate request
  const validation =
    jobMatchingRequestSchema.safeParse(input);

  if (!validation.success) {
    throw new JobMatchingError(
      validation.error.issues[0]?.message ||
        "Invalid job matching request",
      400
    );
  }

  const {
    resumeId,
    jobTitle,
    companyName,
    jobDescription,
  } = validation.data;

  // Verify resume ownership
  const resume = await Resume.findOne({
    _id: resumeId,
    userId,
    status: "processed",
  }).select("+extractedText");

  if (!resume) {
    throw new JobMatchingError(
      "Resume not found or not processed",
      404
    );
  }

  if (!resume.extractedText?.trim()) {
    throw new JobMatchingError(
      "Resume does not contain extracted text",
      422
    );
  }

  // Redact unnecessary personal information
  const sanitizedResume =
    redactPersonalInformation(
      resume.extractedText
    ).trim();

  const sanitizedJobDescription =
    redactPersonalInformation(
      jobDescription
    ).trim();

  const sanitizedJobTitle =
    redactPersonalInformation(
      jobTitle
    ).trim();

  const sanitizedCompanyName =
    companyName?.trim()
      ? redactPersonalInformation(
          companyName
        ).trim()
      : "Not specified";

  // Validate document lengths
  if (
    sanitizedResume.length < 30 ||
    sanitizedResume.length > 50000
  ) {
    throw new JobMatchingError(
      "Resume text length is unsupported",
      422
    );
  }

  if (
    sanitizedJobDescription.length < 50 ||
    sanitizedJobDescription.length > 20000
  ) {
    throw new JobMatchingError(
      "Job description length is unsupported",
      422
    );
  }

  if (!sanitizedJobTitle) {
    throw new JobMatchingError(
      "Job title is required",
      400
    );
  }

  console.log(
    "Starting job matching pipeline"
  );

  // Step 1: Calculate semantic similarity
  let similarityResult;

  try {

    similarityResult =
      await calculateSemanticSimilarity({
        resumeText: sanitizedResume,

        jobDescription:
          sanitizedJobDescription,
      });

  } catch (error) {

    if (error instanceof SimilarityError) {
      throw new JobMatchingError(
        error.message,
        error.statusCode
      );
    }

    console.error(
      "Semantic similarity failed:",
      error instanceof Error
        ? error.name
        : "Unknown error"
    );

    throw new JobMatchingError(
      "Unable to calculate semantic similarity",
      503
    );
  }

  console.log(
    "Semantic similarity score:",
    similarityResult.semanticScore
  );

  // Normalize resume text for consistent evidence matching
  const normalizedResume =
    normalizeText(sanitizedResume);

  // Step 2: Construct AI prompt
  const prompt = buildJobMatchingPrompt({
    resumeText: normalizedResume,

    jobTitle: sanitizedJobTitle,

    companyName: sanitizedCompanyName,

    jobDescription:
      sanitizedJobDescription,
  });

  // Step 3: Generate and verify AI assessment
  const assessment =
    await generateValidatedAssessment(
      prompt,
      normalizedResume
    );

  const result = assessment.result;

  // Step 4: Calculate hybrid compatibility
  const compatibility =
    calculateJobCompatibility(
      similarityResult.semanticScore,
      result
    );

  // Step 5: Recheck resume availability
  const resumeStillExists =
    await Resume.exists({
      _id: resumeId,
      userId,
      status: "processed",
    });

  if (!resumeStillExists) {
    throw new JobMatchingError(
      "Resume is no longer available",
      409
    );
  }

  const processingTime =
    Date.now() - startTime;

  // Step 6: Save verified report in MongoDB
  const jobMatch = await JobMatch.create({
    userId,

    resumeId,

    jobTitle: sanitizedJobTitle,

    companyName:
      sanitizedCompanyName ||
      "Not specified",

    jobDescription:
      sanitizedJobDescription,

    result,

    overallScore:
      compatibility.overallScore,

    compatibilityLevel:
      compatibility.compatibilityLevel as
        IJobMatch["compatibilityLevel"],

    semanticScore:
      similarityResult.semanticScore,

    averageSimilarity:
      similarityResult.averageSimilarity,

    scores:
      compatibility.scores,

    weights:
      compatibility.weights,

    resumeChunkCount:
      similarityResult.resumeChunkCount,

    jobChunkCount:
      similarityResult.jobChunkCount,

    provider:
      assessment.provider,

    modelUsed:
      assessment.model,

    embeddingModel:
      getEmbeddingModel(),

    promptVersion:
      `${JOB_MATCHING_PROMPT_VERSION}+evidence-retry-v1`,

    scoringVersion:
      compatibility.scoringVersion,

    similarityVersion:
      similarityResult.similarityVersion,

    similarityProcessingTime:
      similarityResult.processingTime,

    processingTime,
  });

  console.log(
    "Job matching completed"
  );

  console.log(
    "Compatibility score:",
    compatibility.overallScore
  );

  console.log(
    "Provider:",
    assessment.provider
  );

  console.log(
    "Processing time:",
    processingTime,
    "ms"
  );

  return jobMatch;
};

// 2. Retrieve user's job matching reports
export const getJobMatches = async (
  userId: string,
  page = 1,
  limit = 20
) => {

  validateId(userId, "user ID");

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw new JobMatchingError(
      "Invalid pagination parameters",
      400
    );
  }

  const filter = { userId };

  const [jobMatches, total] =
    await Promise.all([

      JobMatch.find(filter)
        .select("-jobDescription -result")
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      JobMatch.countDocuments(filter),
    ]);

  return {
    jobMatches,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(total / limit),
    },
  };
};

// 3. Retrieve individual job matching report
export const getJobMatchById = async (
  userId: string,
  jobMatchId: string
) => {

  validateId(userId, "user ID");

  validateId(
    jobMatchId,
    "job match ID"
  );

  const jobMatch = await JobMatch.findOne({
    _id: jobMatchId,
    userId,
  }).lean();

  if (!jobMatch) {
    throw new JobMatchingError(
      "Job matching report not found",
      404
    );
  }

  return jobMatch;
};

// 4. Delete job matching report
export const deleteJobMatch = async (
  userId: string,
  jobMatchId: string
) => {

  validateId(userId, "user ID");

  validateId(
    jobMatchId,
    "job match ID"
  );

  const jobMatch =
    await JobMatch.findOneAndDelete({
      _id: jobMatchId,
      userId,
    });

  if (!jobMatch) {
    throw new JobMatchingError(
      "Job matching report not found",
      404
    );
  }

  return {
    jobMatchId,

    message:
      "Job matching report deleted successfully",
  };
};
export type CompatibilityLevel =
  | "excellent"
  | "good"
  | "moderate"
  | "limited"
  | "low";

export type Priority =
  | "high"
  | "medium"
  | "low";

export interface JobMatchingRequest {
  resumeId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  consent: boolean;
}

export interface MatchedSkill {
  skill: string;
  evidence: string;
  matchType: "exact" | "related";
}

export interface MissingSkill {
  skill: string;
  importance: "required" | "preferred";
  recommendation: string;
}

export interface Assessment {
  score: number;
  explanation: string;
}

export interface JobRecommendation {
  title: string;
  description: string;
  priority: Priority;
}

export interface JobMatchingResult {
  summary: string;

  requiredSkills: string[];

  preferredSkills: string[];

  matchedSkills: MatchedSkill[];

  missingSkills: MissingSkill[];

  strengths: string[];

  gaps: string[];

  assessment: {
    technicalSkills: Assessment;
    experience: Assessment;
    education: Assessment;
    projectRelevance: Assessment;
  };

  recommendations: JobRecommendation[];
}

export interface CompatibilityScores {
  semanticSimilarity: number;
  technicalSkills: number;
  experience: number;
  education: number;
  projectRelevance: number;
}

export interface CompatibilityWeights {
  semanticSimilarity: number;
  technicalSkills: number;
  experience: number;
  education: number;
  projectRelevance: number;
}

// Complete job matching report

export interface JobMatch {
  _id: string;

  userId: string;

  resumeId: string;

  jobTitle: string;

  companyName: string;

  jobDescription: string;

  result: JobMatchingResult;

  overallScore: number;

  compatibilityLevel: CompatibilityLevel;

  semanticScore: number;

  averageSimilarity: number;

  scores: CompatibilityScores;

  weights: CompatibilityWeights;

  resumeChunkCount: number;

  jobChunkCount: number;

  provider: "groq" | "gemini";

  modelUsed: string;

  embeddingModel: string;

  promptVersion: string;

  scoringVersion: string;

  similarityVersion: string;

  similarityProcessingTime: number;

  processingTime: number;

  createdAt: string;

  updatedAt: string;
}

// Lightweight report returned by the list endpoint

export type JobMatchSummary = Omit<
  JobMatch,
  "jobDescription" | "result"
>;

// Pagination information

export interface JobMatchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Job matching history response

export interface JobMatchListResponse {
  jobMatches: JobMatchSummary[];

  pagination: JobMatchPagination;
}

// Common API response

export interface JobMatchApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}
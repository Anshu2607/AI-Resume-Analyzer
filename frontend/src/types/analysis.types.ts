export interface AssessmentCategory {
  score: number;
  explanation: string;
}

export interface ImprovementSuggestion {
  section: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
}

export interface RecommendedRole {
  role: string;
  reason: string;
}

export interface Assessment {
  technicalSkills: AssessmentCategory;
  experience: AssessmentCategory;
  projects: AssessmentCategory;
  education: AssessmentCategory;
  resumeStructure: AssessmentCategory;
  achievements: AssessmentCategory;
}

export interface AnalysisResult {
  professionalSummary: string;
  technicalSkills: string[];
  softSkills: string[];
  strengths: string[];
  weaknesses: string[];
  missingSections: string[];
  improvementSuggestions: ImprovementSuggestion[];
  recommendedRoles: RecommendedRole[];
  assessment: Assessment;
}

export interface Analysis {
  _id: string;
  userId: string;
  resumeId: string;
  result: AnalysisResult;
  overallScore: number;
  modelUsed: string;
  promptVersion: string;
  scoringVersion: string;
  processingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateAnalysisResponse {
  success: boolean;
  message: string;
  data: Analysis;
}

export interface AnalysisListResponse {
  success: boolean;
  count: number;
  data: Analysis[];
}

export interface AnalysisDetailsResponse {
  success: boolean;
  data: Analysis;
}

export interface AnalysisDeleteResponse {
  success: boolean;
  message: string;
}
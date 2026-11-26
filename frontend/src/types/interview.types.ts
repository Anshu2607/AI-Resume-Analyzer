// =====================================
// INTERVIEW TYPES
// =====================================

export type InterviewType =
  | "technical"
  | "hr"
  | "behavioral"
  | "resume_based"
  | "job_specific"
  | "mixed";

export type InterviewDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type InterviewStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

export type QuestionCategory =
  | "technical"
  | "conceptual"
  | "scenario_based"
  | "problem_solving"
  | "project_based"
  | "resume_based"
  | "behavioral"
  | "hr"
  | "system_design";

export type InterviewAnswerStatus =
  | "answered"
  | "skipped";

export type PerformanceLevel =
  | "excellent"
  | "good"
  | "average"
  | "needs_improvement"
  | "poor"
  | "not_assessed";

// =====================================
// CREATE INTERVIEW REQUEST
// =====================================

export interface CreateInterviewRequest {
  interviewType: InterviewType;

  targetRole: string;

  companyName?: string;

  resumeId?: string;

  jobMatchId?: string;

  difficulty: InterviewDifficulty;

  questionCount: number;

  topics: string[];

  adaptiveDifficulty: boolean;

  enableFollowUps: boolean;

  consent: boolean;
}

// =====================================
// PUBLIC INTERVIEW QUESTION
// =====================================

export interface InterviewQuestion {
  questionId: string;

  questionNumber: number;

  question: string;

  category: QuestionCategory;

  topic: string;

  difficulty: InterviewDifficulty;

  isFollowUp: boolean;

  parentQuestionId: string | null;

  generatedAt: string;
}

// =====================================
// ANSWER SUBMISSION
// =====================================

export interface SubmitInterviewAnswerRequest {
  questionId: string;

  answer: string;
}

export interface SkipInterviewQuestionRequest {
  questionId: string;
}

// =====================================
// EVALUATION SCORES
// =====================================

export interface EvaluationScores {
  accuracy: number;

  relevance: number;

  completeness: number;

  clarity: number;
}

// =====================================
// ANSWER EVALUATION
// =====================================

export interface InterviewEvaluation {
  scores: EvaluationScores;

  overallScore: number;

  feedback: string;

  strengths: string[];

  weaknesses: string[];

  missingKeyPoints: string[];

  improvementSuggestions: string[];

  modelAnswer: string;

  recommendFollowUp: boolean;

  followUpFocus: string | null;

  provider: "groq" | "gemini";

  modelUsed: string;

  promptVersion: string;

  processingTime: number;

  evaluatedAt: string;
}

// =====================================
// INTERVIEW ANSWER
// =====================================

export interface InterviewAnswer {
  questionId: string;

  answer: string;

  status: InterviewAnswerStatus;

  evaluation: InterviewEvaluation | null;

  submittedAt: string;
}

// =====================================
// QUESTION HISTORY
// =====================================

export interface InterviewQuestionHistory
  extends InterviewQuestion {

  answer: InterviewAnswer | null;
}

// =====================================
// ADAPTIVE DECISION
// =====================================

export interface AdaptiveDecision {
  shouldCompleteInterview: boolean;

  nextDifficulty: InterviewDifficulty;

  difficultyChanged: boolean;

  difficultyReason: string;

  recentAverageScore: number | null;

  isFollowUp: boolean;

  parentQuestionId: string | null;

  followUpFocus: string | null;
}

// =====================================
// TOPIC PERFORMANCE
// =====================================

export interface TopicPerformance {
  topic: string;

  totalQuestions: number;

  answeredQuestions: number;

  averageScore: number | null;
}

// =====================================
// INTERVIEW PERFORMANCE REPORT
// =====================================

export interface InterviewReport {
  totalQuestions: number;

  answeredQuestions: number;

  skippedQuestions: number;

  overallScore: number | null;

  averageAccuracy: number | null;

  averageRelevance: number | null;

  averageCompleteness: number | null;

  averageClarity: number | null;

  performanceLevel: PerformanceLevel;

  topicPerformance: TopicPerformance[];

  summary: string;

  strengths: string[];

  weaknesses: string[];

  priorityTopics: string[];

  recommendations: string[];

  generatedAt: string;
}

// =====================================
// COMPLETE INTERVIEW SESSION
// =====================================

export interface InterviewSession {
  _id: string;

  resumeId: string | null;

  jobMatchId: string | null;

  interviewType: InterviewType;

  targetRole: string;

  companyName: string | null;

  initialDifficulty: InterviewDifficulty;

  currentDifficulty: InterviewDifficulty;

  questionCount: number;

  topics: string[];

  adaptiveDifficulty: boolean;

  enableFollowUps: boolean;

  status: InterviewStatus;

  currentQuestionIndex: number;

  currentQuestion: InterviewQuestion | null;

  questions: InterviewQuestionHistory[];

  answeredQuestions: number;

  skippedQuestions: number;

  followUpCount: number;

  progressPercentage: number;

  averageScore: number | null;

  report: InterviewReport | null;

  provider: "groq" | "gemini" | null;

  modelUsed: string | null;

  interviewVersion: string;

  isLocked: boolean;

  startedAt: string | null;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;
}

// =====================================
// ANSWER PROCESSING RESPONSE
// =====================================

export interface InterviewAnswerResponse {
  session: InterviewSession;

  latestAnswer: InterviewAnswer;

  adaptiveDecision: AdaptiveDecision;
}

// =====================================
// INTERVIEW HISTORY SUMMARY
// =====================================

export interface InterviewSessionSummary {
  _id: string;

  interviewType: InterviewType;

  targetRole: string;

  companyName: string | null;

  initialDifficulty: InterviewDifficulty;

  currentDifficulty: InterviewDifficulty;

  questionCount: number;

  answeredQuestions: number;

  skippedQuestions: number;

  followUpCount: number;

  progressPercentage: number;

  averageScore: number | null;

  status: InterviewStatus;

  isLocked: boolean;

  interviewVersion: string;

  startedAt: string | null;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;
}

// =====================================
// PAGINATION
// =====================================

export interface InterviewPagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

// =====================================
// INTERVIEW LIST RESPONSE
// =====================================

export interface InterviewListResponse {
  sessions: InterviewSessionSummary[];

  pagination: InterviewPagination;
}

// =====================================
// API RESPONSE
// =====================================

export interface InterviewApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}

// =====================================
// DELETE SESSION RESPONSE
// =====================================

export interface DeleteInterviewResponse {
  sessionId: string;
}
// =====================================
// AGENT TOOL NAMES
// =====================================

export type AgentToolName =
  | "get_resume_analysis"
  | "search_resume"
  | "get_job_match"
  | "generate_job_match"
  | "get_skill_gaps"
  | "generate_roadmap"
  | "get_roadmap_progress";

// =====================================
// AGENT STATUS
// =====================================

export type AgentStatus =
  | "pending"
  | "planning"
  | "executing"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

// =====================================
// TOOL EXECUTION STATUS
// =====================================

export type ToolExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

// =====================================
// LEARNING PREFERENCES
// =====================================

export type AgentDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export interface AgentLearningPreferences {
  durationWeeks: number;
  hoursPerWeek: number;
  difficulty: AgentDifficulty;
}

// =====================================
// AGENT REQUEST
// =====================================

export interface AgentRequest {
  goal: string;

  resumeId?: string;

  analysisId?: string;

  jobMatchId?: string;

  roadmapId?: string;

  jobTitle?: string;

  companyName?: string;

  jobDescription?: string;

  learningPreferences?: AgentLearningPreferences;

  consent: boolean;
}

// =====================================
// EXECUTION STEP
// =====================================

export interface AgentExecutionStep {
  stepNumber: number;

  toolName: AgentToolName;

  purpose: string;

  status: ToolExecutionStatus;

  startedAt: string;

  completedAt: string | null;

  durationMs: number;

  resultSummary: string | null;

  errorMessage: string | null;
}

// =====================================
// ARTIFACT TYPES
// =====================================

export type AgentArtifactType =
  | "resume_analysis"
  | "job_match"
  | "skill_gap_report"
  | "roadmap";

export interface AgentArtifact {
  type: AgentArtifactType;

  referenceId: string;

  title: string;
}

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
// APPROVAL REQUEST
// =====================================

export interface AgentApprovalRequest {
  stepNumber: number;

  approved: boolean;
}

// =====================================
// CLARIFICATION
// =====================================

export interface AgentClarification {
  question: string;

  missingFields: string[];
}

// =====================================
// FINAL AGENT RESPONSE
// =====================================

export interface AgentFinalResponse {
  summary: string;

  recommendations: string[];

  limitations: string[];

  artifacts: AgentArtifact[];
}

// =====================================
// RESOURCE REFERENCES
// =====================================

export interface AgentResourceReferences {
  resumeId: string | null;

  analysisId: string | null;

  jobMatchId: string | null;

  roadmapId: string | null;

  jobTitle: string | null;

  companyName: string | null;
}

// =====================================
// COMPLETE AGENT SESSION
// =====================================

export interface AgentSession {
  _id: string;

  title: string;

  goal: string;

  status: AgentStatus;

  iteration: number;

  totalToolCalls: number;

  generativeToolCalls: number;

  executionSteps: AgentExecutionStep[];

  artifacts: AgentArtifact[];

  pendingApproval: PendingToolApproval | null;

  clarification: AgentClarification | null;

  finalResponse: AgentFinalResponse | null;

  errorMessage: string | null;

  learningPreferences: AgentLearningPreferences;

  resourceReferences: AgentResourceReferences;

  provider: "groq" | "gemini" | null;

  modelUsed: string | null;

  promptVersion: string | null;

  agentVersion: string;

  startedAt: string;

  completedAt: string | null;

  activeExecutionTimeMs: number;

  createdAt: string;

  updatedAt: string;

  isLocked?: false;
}

// =====================================
// CURRENTLY EXECUTING SESSION
// =====================================

export interface LockedAgentSession {
  _id: string;

  title: string;

  goal: string;

  status: AgentStatus;

  isLocked: true;

  pendingApproval: null;

  message: string;

  updatedAt: string;
}

// =====================================
// SESSION DETAILS RESPONSE
// =====================================

export type AgentSessionDetails =
  | AgentSession
  | LockedAgentSession;

// =====================================
// SESSION HISTORY SUMMARY
// =====================================

export interface AgentSessionSummary {
  _id: string;

  title: string;

  goal: string;

  status: AgentStatus;

  iteration: number;

  totalToolCalls: number;

  generativeToolCalls: number;

  artifactCount: number;

  agentVersion: string;

  startedAt: string;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;

  isLocked: boolean;
}

// =====================================
// PAGINATION
// =====================================

export interface AgentPagination {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

// =====================================
// SESSION LIST RESPONSE
// =====================================

export interface AgentSessionListResponse {
  sessions: AgentSessionSummary[];

  pagination: AgentPagination;
}

// =====================================
// GENERIC API RESPONSE
// =====================================

export interface AgentApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}

// =====================================
// DELETE SESSION RESPONSE
// =====================================

export interface DeleteAgentSessionResponse {
  sessionId: string;
}
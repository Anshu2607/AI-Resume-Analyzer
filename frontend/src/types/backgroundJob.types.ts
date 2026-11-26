// =====================================
// BACKGROUND JOB TYPES
// =====================================

export type BackgroundJobType =
  | "resume-analysis"
  | "job-matching"
  | "career-roadmap"
  | "interview-report";

// =====================================
// BACKGROUND JOB STATUS
// =====================================

export type BackgroundJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retrying"
  | "paused"
  | "unknown";

// =====================================
// BACKGROUND JOB RESULT
// =====================================

export interface BackgroundJobResult {
  success: boolean;

  resourceId: string;

  resultId: string;

  completedAt: string;
}

// =====================================
// BACKGROUND JOB RESPONSE
// =====================================

export interface BackgroundJob {
  jobId: string;

  jobType: BackgroundJobType;

  resourceId: string;

  requestId: string;

  status: BackgroundJobStatus;

  progress: number;

  attemptsMade: number;

  maxAttempts: number;

  result: BackgroundJobResult | null;

  error: string | null;

  createdAt: string;

  startedAt: string | null;

  completedAt: string | null;
}

// =====================================
// BACKGROUND JOB API RESPONSE
// =====================================

export interface BackgroundJobApiResponse<T> {
  success: boolean;

  message?: string;

  data: T;
}

// =====================================
// BACKGROUND JOB POLLING OPTIONS
// =====================================

export interface BackgroundJobPollingOptions {
  intervalMs?: number;

  maxPollingDurationMs?: number;
}

// =====================================
// BACKGROUND JOB UI STATE
// =====================================

export interface BackgroundJobState {
  job: BackgroundJob | null;

  isSubmitting: boolean;

  isPolling: boolean;

  isRetrying: boolean;

  error: string | null;
}
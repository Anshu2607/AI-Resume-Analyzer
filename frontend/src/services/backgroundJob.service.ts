import api from "./api";

import type {
  BackgroundJob,
  BackgroundJobApiResponse,
} from "../types/backgroundJob.types";

// =====================================
// REQUEST CONFIGURATION
// =====================================

const BACKGROUND_JOB_TIMEOUT = 15000;

// =====================================
// GENERATE IDEMPOTENCY KEY
// =====================================

export const generateIdempotencyKey =
  (): string => {
    return crypto.randomUUID();
  };

// =====================================
// BACKGROUND JOB API SERVICE
// =====================================

export const backgroundJobService = {

  // ===================================
  // 1. QUEUE INTERVIEW REPORT
  // ===================================

  async queueInterviewReport(
    sessionId: string,

    idempotencyKey: string,

    signal?: AbortSignal
  ): Promise<BackgroundJob> {

    const response = await api.post<
      BackgroundJobApiResponse<BackgroundJob>
    >(
      `/jobs/interview-report/${encodeURIComponent(
        sessionId
      )}`,

      undefined,

      {
        timeout: BACKGROUND_JOB_TIMEOUT,

        signal,

        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      }
    );

    return response.data.data;
  },

  // ===================================
  // 2. GET BACKGROUND JOB STATUS
  // ===================================

  async getStatus(
    jobId: string,

    signal?: AbortSignal
  ): Promise<BackgroundJob> {

    const response = await api.get<
      BackgroundJobApiResponse<BackgroundJob>
    >(
      `/jobs/${encodeURIComponent(jobId)}`,

      {
        timeout: BACKGROUND_JOB_TIMEOUT,

        signal,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 3. RETRY FAILED BACKGROUND JOB
  // ===================================

  async retry(
    jobId: string,

    signal?: AbortSignal
  ): Promise<BackgroundJob> {

    const response = await api.post<
      BackgroundJobApiResponse<BackgroundJob>
    >(
      `/jobs/${encodeURIComponent(jobId)}/retry`,

      undefined,

      {
        timeout: BACKGROUND_JOB_TIMEOUT,

        signal,
      }
    );

    return response.data.data;
  },
};

export default backgroundJobService;
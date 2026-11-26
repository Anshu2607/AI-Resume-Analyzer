import api from "./api";

import type {
  CreateInterviewRequest,
  InterviewSession,
  InterviewListResponse,
  SubmitInterviewAnswerRequest,
  SkipInterviewQuestionRequest,
  InterviewAnswerResponse,
  InterviewReport,
  InterviewApiResponse,
  DeleteInterviewResponse,
} from "../types/interview.types";

// =====================================
// REQUEST TIMEOUT
// =====================================

// Interview operations may require multiple
// external AI requests.

const INTERVIEW_REQUEST_TIMEOUT = 300000;

// =====================================
// INTERVIEW API SERVICE
// =====================================

export const interviewService = {

  // ===================================
  // 1. CREATE INTERVIEW SESSION
  // ===================================

  async createSession(
    request: CreateInterviewRequest
  ): Promise<InterviewSession> {

    const response = await api.post<
      InterviewApiResponse<InterviewSession>
    >(
      "/interviews",
      request,
      {
        timeout: INTERVIEW_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 2. GET INTERVIEW HISTORY
  // ===================================

  async getAll(
    page = 1,
    limit = 20
  ): Promise<InterviewListResponse> {

    const response = await api.get<
      InterviewApiResponse<InterviewListResponse>
    >(
      "/interviews",
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data.data;
  },

  // ===================================
  // 3. GET INTERVIEW SESSION
  // ===================================

  async getById(
    sessionId: string
  ): Promise<InterviewSession> {

    const response = await api.get<
      InterviewApiResponse<InterviewSession>
    >(
      `/interviews/${encodeURIComponent(sessionId)}`
    );

    return response.data.data;
  },

  // ===================================
  // 4. SUBMIT INTERVIEW ANSWER
  // ===================================

  async submitAnswer(
    sessionId: string,
    request: SubmitInterviewAnswerRequest
  ): Promise<InterviewAnswerResponse> {

    const response = await api.post<
      InterviewApiResponse<InterviewAnswerResponse>
    >(
      `/interviews/${encodeURIComponent(sessionId)}/answer`,
      request,
      {
        timeout: INTERVIEW_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 5. SKIP INTERVIEW QUESTION
  // ===================================

  async skipQuestion(
    sessionId: string,
    request: SkipInterviewQuestionRequest
  ): Promise<InterviewAnswerResponse> {

    const response = await api.post<
      InterviewApiResponse<InterviewAnswerResponse>
    >(
      `/interviews/${encodeURIComponent(sessionId)}/skip`,
      request,
      {
        timeout: INTERVIEW_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 6. GENERATE PERFORMANCE REPORT
  // ===================================

  async generateReport(
    sessionId: string
  ): Promise<InterviewReport> {

    const response = await api.post<
      InterviewApiResponse<InterviewReport>
    >(
      `/interviews/${encodeURIComponent(sessionId)}/report`,
      undefined,
      {
        timeout: INTERVIEW_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 7. GET SAVED PERFORMANCE REPORT
  // ===================================

  async getReport(
    sessionId: string
  ): Promise<InterviewReport> {

    const response = await api.get<
      InterviewApiResponse<InterviewReport>
    >(
      `/interviews/${encodeURIComponent(sessionId)}/report`
    );

    return response.data.data;
  },

  // ===================================
  // 8. CANCEL INTERVIEW SESSION
  // ===================================

  async cancel(
    sessionId: string
  ): Promise<InterviewSession> {

    const response = await api.patch<
      InterviewApiResponse<InterviewSession>
    >(
      `/interviews/${encodeURIComponent(sessionId)}/cancel`
    );

    return response.data.data;
  },

  // ===================================
  // 9. DELETE INTERVIEW SESSION
  // ===================================

  async delete(
    sessionId: string
  ): Promise<DeleteInterviewResponse> {

    const response = await api.delete<
      InterviewApiResponse<DeleteInterviewResponse>
    >(
      `/interviews/${encodeURIComponent(sessionId)}`
    );

    return response.data.data;
  },
};

export default interviewService;
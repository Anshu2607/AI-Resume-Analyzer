import api from "./api";

import type {
  AgentRequest,
  AgentSession,
  AgentSessionDetails,
  AgentApprovalRequest,
  AgentSessionListResponse,
  AgentApiResponse,
  DeleteAgentSessionResponse,
} from "../types/agent.types";

// =====================================
// REQUEST TIMEOUT
// =====================================

// Agent operations involve multiple LLM
// requests and backend tool executions.

const AGENT_REQUEST_TIMEOUT = 300000;

// =====================================
// AGENT API SERVICE
// =====================================

export const agentService = {

  // ===================================
  // 1. START AGENT EXECUTION
  // ===================================

  async createSession(
    request: AgentRequest
  ): Promise<AgentSession> {

    const response = await api.post<
      AgentApiResponse<AgentSession>
    >(
      "/agents",
      request,
      {
        timeout: AGENT_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 2. GET SESSION HISTORY
  // ===================================

  async getAll(
    page = 1,
    limit = 20
  ): Promise<AgentSessionListResponse> {

    const response = await api.get<
      AgentApiResponse<AgentSessionListResponse>
    >(
      "/agents",
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
  // 3. GET INDIVIDUAL SESSION
  // ===================================

  async getById(
    sessionId: string
  ): Promise<AgentSessionDetails> {

    const response = await api.get<
      AgentApiResponse<AgentSessionDetails>
    >(
      `/agents/${encodeURIComponent(sessionId)}`
    );

    return response.data.data;
  },

  // ===================================
  // 4. APPROVE OR DECLINE ACTION
  // ===================================

  async approve(
    sessionId: string,
    request: AgentApprovalRequest
  ): Promise<AgentSession> {

    const response = await api.post<
      AgentApiResponse<AgentSession>
    >(
      `/agents/${encodeURIComponent(sessionId)}/approval`,
      request,
      {
        timeout: AGENT_REQUEST_TIMEOUT,
      }
    );

    return response.data.data;
  },

  // ===================================
  // 5. CANCEL PAUSED SESSION
  // ===================================

  async cancel(
    sessionId: string
  ): Promise<AgentSession> {

    const response = await api.patch<
      AgentApiResponse<AgentSession>
    >(
      `/agents/${encodeURIComponent(sessionId)}/cancel`
    );

    return response.data.data;
  },

  // ===================================
  // 6. DELETE AGENT SESSION
  // ===================================

  async delete(
    sessionId: string
  ): Promise<DeleteAgentSessionResponse> {

    const response = await api.delete<
      AgentApiResponse<DeleteAgentSessionResponse>
    >(
      `/agents/${encodeURIComponent(sessionId)}`
    );

    return response.data.data;
  },
};

export default agentService;
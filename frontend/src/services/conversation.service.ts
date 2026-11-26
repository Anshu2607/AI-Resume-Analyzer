import api from "./api";

import type {
  ApiResponse,
  Conversation,
  ConversationList,
  ConversationHistory,
  SendMessageRequest,
  SendMessageResponse,
  IndexingResult,
  IndexingStatus,
} from "../types/conversation.types";

export const conversationService = {

  // Create a new conversation
  async createConversation(
    resumeId: string
  ): Promise<Conversation> {

    const response =
      await api.post<ApiResponse<Conversation>>(
        "/conversations",
        { resumeId }
      );

    return response.data.data;
  },

  // Retrieve conversations
  async getConversations(
    page = 1,
    limit = 20
  ): Promise<ConversationList> {

    const response =
      await api.get<ApiResponse<ConversationList>>(
        "/conversations",
        {
          params: { page, limit },
        }
      );

    return response.data.data;
  },

  // Retrieve conversation history
  async getConversation(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<ConversationHistory> {

    const response =
      await api.get<ApiResponse<ConversationHistory>>(
        `/conversations/${conversationId}`,
        {
          params: { page, limit },
        }
      );

    return response.data.data;
  },

  // Send a question to the RAG engine
  async sendMessage(
    conversationId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {

    const response =
      await api.post<ApiResponse<SendMessageResponse>>(
        `/conversations/${conversationId}/messages`,
        request,
        {
          timeout: 120000,
        }
      );

    return response.data.data;
  },

  // Rename a conversation
  async renameConversation(
    conversationId: string,
    title: string
  ): Promise<Conversation> {

    const response =
      await api.patch<ApiResponse<Conversation>>(
        `/conversations/${conversationId}/title`,
        { title }
      );

    return response.data.data;
  },

  // Archive or restore a conversation
  async updateStatus(
    conversationId: string,
    status: "active" | "archived"
  ): Promise<Conversation> {

    const response =
      await api.patch<ApiResponse<Conversation>>(
        `/conversations/${conversationId}/status`,
        { status }
      );

    return response.data.data;
  },

  // Delete a conversation
  async deleteConversation(
    conversationId: string
  ): Promise<void> {

    await api.delete(
      `/conversations/${conversationId}`
    );
  },

  // Check whether a resume is indexed
  async getIndexingStatus(
    resumeId: string
  ): Promise<IndexingStatus> {

    const response =
      await api.get<ApiResponse<IndexingStatus>>(
        `/vectors/index/${resumeId}`
      );

    return response.data.data;
  },

  // Generate and store resume embeddings
  async indexResume(
    resumeId: string
  ): Promise<IndexingResult> {

    const response =
      await api.post<ApiResponse<IndexingResult>>(
        `/vectors/index/${resumeId}`,
        undefined,
        {
          timeout: 180000,
        }
      );

    return response.data.data;
  },
};

export default conversationService;
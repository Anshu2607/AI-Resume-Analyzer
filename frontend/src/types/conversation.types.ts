export interface Conversation {
  _id: string;
  userId: string;
  resumeId: string;
  title: string;
  status: "active" | "archived";
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportingEvidence {
  sourceId: string;
  evidence: string;
}

export interface MessageSource {
  sourceId: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface MessageMetadata {
  provider: "groq" | "gemini" | null;
  modelUsed: string | null;
  promptVersion: string;
  confidence: "high" | "medium" | "low";
  insufficientContext: boolean;
  retrievalTime: number;
  processingTime: number;
}

export interface Message {
  _id: string;
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  supportingEvidence: SupportingEvidence[];
  sources: MessageSource[];
  followUpQuestions: string[];
  metadata?: MessageMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConversationList {
  conversations: Conversation[];
  pagination: Pagination;
}

export interface ConversationHistory {
  conversation: Conversation;
  messages: Message[];
  pagination: Pagination;
}

export interface SendMessageRequest {
  question: string;
  limit?: number;
  consent: boolean;
}

export interface SendMessageResponse {
  conversation: Conversation;
  userMessage: Message;
  assistantMessage: Message;
}

export interface IndexingResult {
  resumeId: string;
  status: "indexed";
  chunkCount: number;
  embeddingModel: string;
  embeddingDimensions: number;
  processingTime: number;
}

export interface IndexingStatus {
  resumeId: string;
  indexed: boolean;
  chunkCount: number;
  embeddingModel?: string | null;
  embeddingDimensions?: number | null;
  embeddingVersion?: string | null;
  chunkingVersion?: string | null;
  indexedAt?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
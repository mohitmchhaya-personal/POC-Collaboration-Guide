export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type EvidenceQuality = "high" | "medium" | "low" | "unknown";

export type RecommendationSource = {
  title?: string;
  url: string;
};

/**
 * Structured recommendation preserved from n8n. Only recognized, validated
 * fields are kept; `name` is required and nothing is synthesized.
 */
export type Recommendation = {
  name: string;
  score?: number;
  whyThisFits?: string;
  collaborationOpportunity?: string;
  strengths?: string[];
  considerations?: string[];
  evidenceQuality?: EvidenceQuality;
  sources?: RecommendationSource[];
};

export type ChatRequest = {
  sessionId: string;
  message: string;
};

export type ChatResponse = {
  sessionId: string;
  message: { role: "assistant"; content: string };
  recommendations?: Recommendation[];
};

export type TranscriptMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type SendChatMessage = (
  request: ChatRequest,
  options?: { signal?: AbortSignal },
) => Promise<ChatResponse>;

export type ChatErrorCode =
  | "invalid_request"
  | "not_configured"
  | "upstream_auth"
  | "upstream_not_found"
  | "upstream_rejected"
  | "upstream_rate_limited"
  | "upstream_timeout"
  | "upstream_unavailable"
  | "upstream_malformed";

export type ChatErrorResponse = {
  error: string;
  code: ChatErrorCode;
  requestId: string;
};

export const CONVERSATION_STORAGE_KEY = "spreadbliss.conversation.v1";

export type StoredConversation = {
  sessionId: string;
  messages: TranscriptMessage[];
};

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_SESSION_ID_LENGTH = 128;

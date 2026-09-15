export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type Recommendation = {
  name: string;
  summary: string;
  url?: string;
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

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_SESSION_ID_LENGTH = 128;

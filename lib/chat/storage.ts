import {
  CONVERSATION_STORAGE_KEY,
  type StoredConversation,
  type TranscriptMessage,
} from "./types";
import { parseRecommendations } from "./recommendation-guards";
import { isValidSessionId } from "./session";

function isTranscriptMessage(value: unknown): value is TranscriptMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const message = value as Record<string, unknown>;
  if (
    !(
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
    )
  ) {
    return false;
  }
  const parsedRecommendations = parseRecommendations(message.recommendations);
  if (message.recommendations !== undefined && parsedRecommendations) {
    message.recommendations = parsedRecommendations;
  } else {
    delete message.recommendations;
  }
  return true;
}

function isStoredConversation(value: unknown): value is StoredConversation {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const conversation = value as Record<string, unknown>;
  return (
    isValidSessionId(conversation.sessionId) &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isTranscriptMessage)
  );
}

export function loadStoredConversation(): StoredConversation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredConversation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredConversation(conversation: StoredConversation): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CONVERSATION_STORAGE_KEY,
      JSON.stringify(conversation),
    );
  } catch {
    return;
  }
}

export function clearStoredConversation(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
  } catch {
    return;
  }
}

import { isValidSessionId } from "./session";
import {
  MAX_MESSAGE_LENGTH,
  type ChatRequest,
} from "./types";

export function isValidMessage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_MESSAGE_LENGTH
  );
}

export type ValidationResult =
  | { ok: true; value: ChatRequest }
  | { ok: false; error: string };

export function validateChatRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const request = body as Record<string, unknown>;
  const { message, sessionId } = request;

  if (message === undefined || message === null) {
    return { ok: false, error: "message is required." };
  }
  if (typeof message !== "string") {
    return { ok: false, error: "message must be a string." };
  }
  if (message.trim().length === 0) {
    return { ok: false, error: "message must not be blank." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: "message must be at most 4000 characters.",
    };
  }
  if (sessionId === undefined || sessionId === null) {
    return { ok: false, error: "sessionId is required." };
  }
  if (!isValidSessionId(sessionId)) {
    return { ok: false, error: "sessionId is invalid." };
  }

  return {
    ok: true,
    value: { sessionId, message: message.trim() },
  };
}

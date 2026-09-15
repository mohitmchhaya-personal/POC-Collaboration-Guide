import type {
  ChatErrorCode,
  ChatRequest,
  SendChatMessage,
} from "./types";
import { parseRecommendations } from "./recommendation-guards";

const CHAT_ERROR_CODES: ReadonlySet<string> = new Set([
  "invalid_request",
  "not_configured",
  "upstream_auth",
  "upstream_not_found",
  "upstream_rejected",
  "upstream_rate_limited",
  "upstream_timeout",
  "upstream_unavailable",
  "upstream_malformed",
]);

export class ChatTransportError extends Error {
  readonly code?: ChatErrorCode;
  readonly status: number;

  constructor(message: string, status: number, code?: ChatErrorCode) {
    super(message);
    this.name = "ChatTransportError";
    this.status = status;
    this.code = code;
  }
}

function isChatErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === "string" && CHAT_ERROR_CODES.has(value);
}

type ChatResponseEnvelope = {
  sessionId: string;
  message: { role: "assistant"; content: string };
  recommendations?: unknown;
};

function isChatResponseEnvelope(
  value: unknown,
): value is ChatResponseEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as {
    sessionId?: unknown;
    message?: unknown;
  };
  const message = candidate.message;
  return (
    typeof candidate.sessionId === "string" &&
    typeof message === "object" &&
    message !== null &&
    !Array.isArray(message) &&
    (message as { role?: unknown }).role === "assistant" &&
    typeof (message as { content?: unknown }).content === "string"
  );
}

export const sendChatMessageViaApi: SendChatMessage = async (
  request: ChatRequest,
  options = {},
) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: request.message,
      sessionId: request.sessionId,
    }),
    signal: options.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    const code =
      typeof body === "object" &&
      body !== null &&
      isChatErrorCode((body as { code?: unknown }).code)
        ? (body as { code: ChatErrorCode }).code
        : undefined;
    throw new ChatTransportError("Chat request failed", response.status, code);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ChatTransportError("Unrecognized response", response.status);
  }
  if (!isChatResponseEnvelope(body)) {
    throw new ChatTransportError("Unrecognized response", response.status);
  }

  const recommendations = parseRecommendations(body.recommendations);
  return {
    sessionId: body.sessionId,
    message: {
      role: "assistant",
      content: body.message.content,
    },
    ...(recommendations ? { recommendations } : {}),
  };
};

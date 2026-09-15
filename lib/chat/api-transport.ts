import type {
  ChatErrorCode,
  ChatResponse,
  ChatRequest,
  SendChatMessage,
} from "./types";

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

function isChatResponse(value: unknown): value is ChatResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as {
    sessionId?: unknown;
    message?: { role?: unknown; content?: unknown };
  };
  return (
    typeof candidate.sessionId === "string" &&
    candidate.message?.role === "assistant" &&
    typeof candidate.message.content === "string"
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
  if (!isChatResponse(body)) {
    throw new ChatTransportError("Unrecognized response", response.status);
  }

  const result = { ...(body as ChatResponse) };
  if (!Array.isArray(result.recommendations)) {
    delete result.recommendations;
  }
  return result;
};

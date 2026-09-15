import { describe, expect, it } from "vitest";

import {
  CHAT_ERROR_MESSAGES,
  describeChatError,
} from "@/lib/chat/error-messages";
import { ChatTransportError } from "@/lib/chat/api-transport";

describe("describeChatError", () => {
  it.each([
    [
      "timeout code",
      new ChatTransportError(
        "upstream https://secret.example n8n 504",
        502,
        "http",
        "upstream_timeout",
      ),
      CHAT_ERROR_MESSAGES.timeout,
    ],
    [
      "timeout status",
      new ChatTransportError("504 upstream detail", 504, "http"),
      CHAT_ERROR_MESSAGES.timeout,
    ],
    [
      "busy code",
      new ChatTransportError("429 n8n", 500, "http", "upstream_rate_limited"),
      CHAT_ERROR_MESSAGES.busy,
    ],
    [
      "busy status",
      new ChatTransportError("429 upstream detail", 429, "http"),
      CHAT_ERROR_MESSAGES.busy,
    ],
    [
      "unavailable code",
      new ChatTransportError(
        "upstream auth detail",
        400,
        "http",
        "upstream_auth",
      ),
      CHAT_ERROR_MESSAGES.unavailable,
    ],
    [
      "unavailable status",
      new ChatTransportError("503 upstream detail", 503, "http"),
      CHAT_ERROR_MESSAGES.unavailable,
    ],
    [
      "malformed kind",
      new ChatTransportError("raw body", 200, "malformed"),
      CHAT_ERROR_MESSAGES.invalidResponse,
    ],
    [
      "malformed code",
      new ChatTransportError("raw body", 502, "http", "upstream_malformed"),
      CHAT_ERROR_MESSAGES.invalidResponse,
    ],
    [
      "network kind",
      new ChatTransportError("TypeError: failed to fetch", 0, "network"),
      CHAT_ERROR_MESSAGES.network,
    ],
    [
      "unknown transport error",
      new ChatTransportError("invalid request detail", 400, "http", "invalid_request"),
      CHAT_ERROR_MESSAGES.generic,
    ],
    ["unknown error", new Error("private error"), CHAT_ERROR_MESSAGES.generic],
  ])("maps %s to safe copy", (_name, error, expected) => {
    const message = describeChatError(error);
    expect(message).toBe(expected);
    expect(message).not.toMatch(/http|n8n|\d|private error/i);
  });
});

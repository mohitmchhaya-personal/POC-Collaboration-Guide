import { ChatTransportError } from "./api-transport";

export const CHAT_ERROR_MESSAGES = {
  timeout: "Research took longer than expected. Please try again.",
  busy: "The research service is busy. Please try again shortly.",
  unavailable: "The research service is temporarily unavailable.",
  invalidResponse: "We couldn't process the research response.",
  network: "We couldn't reach the research service.",
  generic: "We couldn't complete that research request. Please try again.",
} as const;

const UNAVAILABLE_CODES = new Set([
  "upstream_unavailable",
  "upstream_auth",
  "upstream_not_found",
  "upstream_rejected",
  "not_configured",
]);

export function describeChatError(error: unknown): string {
  if (!(error instanceof ChatTransportError)) {
    return CHAT_ERROR_MESSAGES.generic;
  }
  if (error.kind === "network") {
    return CHAT_ERROR_MESSAGES.network;
  }
  if (error.kind === "malformed" || error.code === "upstream_malformed") {
    return CHAT_ERROR_MESSAGES.invalidResponse;
  }
  if (error.code === "upstream_timeout" || error.status === 504) {
    return CHAT_ERROR_MESSAGES.timeout;
  }
  if (error.code === "upstream_rate_limited" || error.status === 429) {
    return CHAT_ERROR_MESSAGES.busy;
  }
  if (
    UNAVAILABLE_CODES.has(error.code ?? "") ||
    error.status >= 500 ||
    error.status === 503
  ) {
    return CHAT_ERROR_MESSAGES.unavailable;
  }
  return CHAT_ERROR_MESSAGES.generic;
}

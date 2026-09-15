import "server-only";

import { createHash } from "node:crypto";

export function logChatEvent(event: {
  requestId: string;
  outcome: "success" | "error";
  durationMs: number;
  httpStatus: number;
  upstreamStatus?: number;
  errorCategory?: string;
  sessionIdHash?: string;
}): void {
  console.info(JSON.stringify({ event: "chat_request", ...event }));
}

export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 12);
}

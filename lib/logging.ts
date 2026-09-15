import "server-only";

import { createHash } from "node:crypto";
import type { ShapeDescription } from "@/lib/n8n/describe-shape";

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

export function logUnrecognizedResponseShape(
  shape: ShapeDescription,
  requestContext?: { requestId?: string },
): void {
  if (process.env.NODE_ENV !== "development") return;

  console.warn(
    JSON.stringify({
      event: "n8n_unrecognized_response",
      ...requestContext,
      shape,
    }),
  );
}

import "server-only";

import type { ChatResponse } from "@/lib/chat/types";
import { getServerEnv } from "@/lib/env";
import { N8nError, categorizeUpstreamStatus } from "./errors";
import { normalizeN8nResponse } from "./normalize-response";
import type { N8nChatRequest, N8nClientDeps } from "./types";

export function buildN8nRequest(input: {
  sessionId: string;
  message: string;
}): N8nChatRequest {
  return {
    action: "sendMessage",
    sessionId: input.sessionId,
    chatInput: input.message,
  };
}

export async function sendChatMessage(
  input: { sessionId: string; message: string },
  deps: N8nClientDeps = {},
): Promise<ChatResponse> {
  const env = deps.env ?? getServerEnv();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.n8nRequestTimeoutMs,
  );
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (env.n8nBasicAuth) {
    const credentials = `${env.n8nBasicAuth.user}:${env.n8nBasicAuth.password}`;
    headers.Authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  try {
    let response: Response;
    try {
      response = await fetchImpl(env.n8nChatWebhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(buildN8nRequest(input)),
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw new N8nError("timeout", "n8n request timed out");
      }
      throw new N8nError("network", "n8n request failed");
    }

    if (!response.ok) {
      throw new N8nError(
        categorizeUpstreamStatus(response.status),
        `n8n responded with status ${response.status}`,
        response.status,
      );
    }

    const text = await response.text();
    if (text.length === 0) {
      throw new N8nError("malformed", "empty response body");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new N8nError("malformed", "response body is not JSON");
    }

    return normalizeN8nResponse(parsed, input.sessionId);
  } finally {
    clearTimeout(timeout);
  }
}

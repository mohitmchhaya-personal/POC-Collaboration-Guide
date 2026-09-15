import { NextResponse } from "next/server";

import type {
  ChatErrorResponse,
  ChatResponse,
} from "@/lib/chat/types";
import { validateChatRequest } from "@/lib/chat/validation";
import { EnvValidationError } from "@/lib/env";
import { hashSessionId, logChatEvent } from "@/lib/logging";
import { sendChatMessage } from "@/lib/n8n/client";
import { N8nError, toClientError } from "@/lib/n8n/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse<T>(
  body: T,
  status: number,
  requestId: string,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { "X-Request-Id": requestId },
  });
}

function durationSince(start: number): number {
  return Math.round(performance.now() - start);
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const start = performance.now();
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    const response: ChatErrorResponse = {
      error: "Request body must be valid JSON.",
      code: "invalid_request",
      requestId,
    };
    logChatEvent({
      requestId,
      outcome: "error",
      durationMs: durationSince(start),
      httpStatus: 400,
    });
    return jsonResponse(response, 400, requestId);
  }

  const validation = validateChatRequest(body);
  if (!validation.ok) {
    const response: ChatErrorResponse = {
      error: validation.error,
      code: "invalid_request",
      requestId,
    };
    logChatEvent({
      requestId,
      outcome: "error",
      durationMs: durationSince(start),
      httpStatus: 400,
    });
    return jsonResponse(response, 400, requestId);
  }

  const { value } = validation;
  const sessionIdHash = hashSessionId(value.sessionId);

  try {
    const result: ChatResponse = await sendChatMessage(value);
    logChatEvent({
      requestId,
      outcome: "success",
      durationMs: durationSince(start),
      httpStatus: 200,
      sessionIdHash,
    });
    return jsonResponse(result, 200, requestId);
  } catch (error: unknown) {
    if (error instanceof EnvValidationError) {
      const response: ChatErrorResponse = {
        error: "The chat service is not configured.",
        code: "not_configured",
        requestId,
      };
      logChatEvent({
        requestId,
        outcome: "error",
        durationMs: durationSince(start),
        httpStatus: 503,
        sessionIdHash,
      });
      return jsonResponse(response, 503, requestId);
    }

    if (error instanceof N8nError) {
      const clientError = toClientError(error.category);
      const response: ChatErrorResponse = {
        error: clientError.error,
        code: clientError.code,
        requestId,
      };
      logChatEvent({
        requestId,
        outcome: "error",
        durationMs: durationSince(start),
        httpStatus: clientError.status,
        upstreamStatus: error.upstreamStatus,
        errorCategory: error.category,
        sessionIdHash,
      });
      return jsonResponse(response, clientError.status, requestId);
    }

    const response: ChatErrorResponse = {
      error: "The chat service is temporarily unavailable.",
      code: "upstream_unavailable",
      requestId,
    };
    logChatEvent({
      requestId,
      outcome: "error",
      durationMs: durationSince(start),
      httpStatus: 502,
      sessionIdHash,
    });
    return jsonResponse(response, 502, requestId);
  }
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const response: ChatErrorResponse = {
    error: "Method not allowed",
    code: "invalid_request",
    requestId,
  };
  logChatEvent({
    requestId,
    outcome: "error",
    durationMs: 0,
    httpStatus: 405,
  });
  return jsonResponse(response, 405, requestId);
}

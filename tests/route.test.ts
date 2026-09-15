import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/chat/route";

const webhookUrl = "https://example.test/webhook";

function request(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function upstream(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/chat", () => {
  it("returns a normalized response and request id", async () => {
    vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
    vi.stubGlobal("fetch", vi.fn(async () => upstream({ text: "Reply" })));

    const response = await POST(
      request({ sessionId: "session-1", message: "Hello" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      sessionId: "session-1",
      message: { role: "assistant", content: "Reply" },
    });
    expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns structured recommendations", async () => {
    vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        upstream({
          text: "Recommendations",
          recommendations: [{ name: "Partner" }],
        }),
      ),
    );

    const response = await POST(
      request({ sessionId: "session-1", message: "Hello" }),
    );
    expect(await response.json()).toMatchObject({
      recommendations: [{ name: "Partner" }],
    });
  });

  it.each([
    ["missing message", { sessionId: "session-1" }, "message is required."],
    [
      "blank message",
      { sessionId: "session-1", message: " " },
      "message must not be blank.",
    ],
    [
      "oversized message",
      { sessionId: "session-1", message: "x".repeat(4001) },
      "message must be at most 4000 characters.",
    ],
    ["missing session id", { message: "Hello" }, "sessionId is required."],
  ])("rejects %s", async (_name, body, error) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error,
      code: "invalid_request",
    });
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Request body must be valid JSON.",
      code: "invalid_request",
    });
  });

  it.each([
    [429, 429, "upstream_rate_limited"],
    [500, 502, "upstream_unavailable"],
    [401, 502, "upstream_auth"],
  ] as const)(
    "maps upstream %s to %s",
    async (upstreamStatus, status, code) => {
      vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => upstream({}, upstreamStatus)),
      );

      const response = await POST(
        request({ sessionId: "session-1", message: "Hello" }),
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ code });
    },
  );

  it("maps malformed upstream JSON", async () => {
    vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{bad", { status: 200 })),
    );

    const response = await POST(
      request({ sessionId: "session-1", message: "Hello" }),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "upstream_malformed" });
  });

  it("maps an upstream timeout", async () => {
    vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
    vi.stubEnv("N8N_REQUEST_TIMEOUT_MS", "20");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      ),
    );

    const response = await POST(
      request({ sessionId: "session-1", message: "Hello" }),
    );
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ code: "upstream_timeout" });
  });

  it("returns not configured when the webhook is missing", async () => {
    const response = await POST(
      request({ sessionId: "session-1", message: "Hello" }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "not_configured" });
  });

  it("does not expose the upstream URL in an error or log", async () => {
    vi.stubEnv("N8N_CHAT_WEBHOOK_URL", webhookUrl);
    vi.stubGlobal("fetch", vi.fn(async () => upstream({}, 500)));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await POST(
      request({ sessionId: "session-1", message: "private message" }),
    );
    const body = JSON.stringify(await response.json());
    const logs = info.mock.calls.map(([line]) => String(line)).join("\n");

    expect(body).not.toContain("example.test");
    expect(logs).not.toContain("example.test");
    expect(logs).not.toContain("private message");
  });
});

describe("GET /api/chat", () => {
  it("returns method not allowed with a request id", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(await response.json()).toMatchObject({
      error: "Method not allowed",
      code: "invalid_request",
    });
    expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

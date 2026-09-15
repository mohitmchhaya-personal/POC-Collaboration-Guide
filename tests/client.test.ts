import { describe, expect, it } from "vitest";

import { sendChatMessage } from "@/lib/n8n/client";

const env = {
  n8nChatWebhookUrl: "https://example.test/webhook",
  n8nRequestTimeoutMs: 1000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendChatMessage", () => {
  it("sends the expected request with no-store caching", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = (async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return jsonResponse({ text: "Reply" });
    }) as typeof fetch;

    const result = await sendChatMessage(
      { sessionId: "session-1", message: "Hello" },
      { env, fetchImpl },
    );

    expect(result.message.content).toBe("Reply");
    expect(capturedUrl).toBe(env.n8nChatWebhookUrl);
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.cache).toBe("no-store");
    expect(capturedInit?.redirect).toBe("error");
    expect(capturedInit?.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      action: "sendMessage",
      sessionId: "session-1",
      chatInput: "Hello",
    });
  });

  it("adds Basic auth only when configured", async () => {
    let capturedHeaders: HeadersInit | undefined;
    const fetchImpl = (async (_url, init) => {
      capturedHeaders = init?.headers;
      return jsonResponse({ text: "Reply" });
    }) as typeof fetch;

    await sendChatMessage(
      { sessionId: "session-1", message: "Hello" },
      {
        env: {
          ...env,
          n8nBasicAuth: { user: "user", password: "pass" },
        },
        fetchImpl,
      },
    );

    expect(capturedHeaders).toMatchObject({
      Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
    });
  });

  it.each([
    [400, "rejected"],
    [401, "auth"],
    [403, "auth"],
    [404, "not_found"],
    [429, "rate_limited"],
    [500, "server"],
    [503, "server"],
  ] as const)("maps upstream status %s to %s", async (status, category) => {
    const fetchImpl = (async () => new Response("", { status })) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category, upstreamStatus: status });
  });

  it("rejects a non-JSON response body", async () => {
    const fetchImpl = (async () => new Response("not json")) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "malformed" });
  });

  it("rejects an empty response body", async () => {
    const fetchImpl = (async () => new Response("")) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "malformed" });
  });

  it("maps an abort to timeout", async () => {
    const fetchImpl = ((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      })) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env: { ...env, n8nRequestTimeoutMs: 20 }, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "timeout" });
  });

  it("maps a generic fetch rejection to network", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("connection failed");
    }) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "network" });
  });
});

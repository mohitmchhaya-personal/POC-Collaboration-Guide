import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ChatTransportError,
  sendChatMessageViaApi,
} from "@/lib/chat/api-transport";

afterEach(() => {
  vi.unstubAllGlobals();
});

function validResponse() {
  return new Response(
    JSON.stringify({
      sessionId: "session-1",
      message: { role: "assistant", content: "A response." },
    }),
    { status: 200 },
  );
}

describe("sendChatMessageViaApi", () => {
  it("posts the chat request with the provided signal", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return validResponse();
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendChatMessageViaApi(
      { sessionId: "session-1", message: "Hello" },
      { signal: controller.signal },
    );

    expect(result.message.content).toBe("A response.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      }),
    );
    expect(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string),
    ).toEqual({
      message: "Hello",
      sessionId: "session-1",
    });
  });

  it("rejects an unrecognized successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ weird: 1 }))),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).rejects.toMatchObject<Partial<ChatTransportError>>({
      status: 200,
      message: "Unrecognized response",
    });
  });

  it("preserves a known API error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "Unavailable",
              code: "upstream_unavailable",
              requestId: "request-1",
            }),
            { status: 502 },
          ),
      ),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).rejects.toMatchObject({
      status: 502,
      code: "upstream_unavailable",
    });
  });

  it("handles a non-JSON API error without a code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 429 })),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).rejects.toMatchObject({
      status: 429,
      code: undefined,
    });
  });

  it("rethrows AbortError unchanged", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw abortError;
      }),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).rejects.toBe(abortError);
  });

  it("keeps valid recommendations from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            sessionId: "session-1",
            message: { role: "assistant", content: "A response." },
            recommendations: [{ name: "Example Partners", score: 82 }],
          }),
        ),
      ),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).resolves.toMatchObject({
      recommendations: [{ name: "Example Partners", score: 82 }],
    });
  });

  it("drops malformed recommendations while keeping response content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            sessionId: "session-1",
            message: { role: "assistant", content: "A response." },
            recommendations: [
              { name: "Example Partners" },
              { name: "Invalid", score: "bad" },
            ],
          }),
        ),
      ),
    );

    await expect(
      sendChatMessageViaApi({ sessionId: "session-1", message: "Hello" }),
    ).resolves.toEqual({
      sessionId: "session-1",
      message: { role: "assistant", content: "A response." },
    });
  });
});

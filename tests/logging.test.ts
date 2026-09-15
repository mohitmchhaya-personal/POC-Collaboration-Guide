import { afterEach, describe, expect, it, vi } from "vitest";

import { sendChatMessage } from "@/lib/n8n/client";

const env = {
  n8nChatWebhookUrl: "https://example.test/webhook",
  n8nRequestTimeoutMs: 1000,
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("unrecognized response diagnostics", () => {
  it("logs only the safe shape in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = (async () =>
      response({
        weird: "SENSITIVE-VALUE",
        output: { nope: "ALSO-SENSITIVE" },
      })) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "malformed" });

    expect(warn).toHaveBeenCalledOnce();
    const logLine = String(warn.mock.calls[0]?.[0]);
    expect(logLine).toContain('"n8n_unrecognized_response"');
    expect(logLine).toContain('"type":"object"');
    expect(logLine).toContain('"keys":["output"]');
    expect(logLine).toContain('"otherKeyCount":1');
    expect(logLine).not.toContain("SENSITIVE");
    expect(logLine).not.toContain("nope");
    expect(logLine).not.toContain("weird");
    expect(logLine).not.toContain("example.test");
  });

  it.each(["production", "test"])(
    "does not log in %s",
    async (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fetchImpl = (async () => response({ unknown: true })) as typeof fetch;

      await expect(
        sendChatMessage(
          { sessionId: "session-1", message: "Hello" },
          { env, fetchImpl },
        ),
      ).rejects.toMatchObject({ category: "malformed" });

      expect(warn).not.toHaveBeenCalled();
    },
  );

  it("does not log upstream status errors", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = (async () => response({}, 500)) as typeof fetch;

    await expect(
      sendChatMessage(
        { sessionId: "session-1", message: "Hello" },
        { env, fetchImpl },
      ),
    ).rejects.toMatchObject({ category: "server" });

    expect(warn).not.toHaveBeenCalled();
  });
});

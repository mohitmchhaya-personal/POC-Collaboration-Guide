import { describe, expect, it } from "vitest";

import { N8nError } from "@/lib/n8n/errors";
import { normalizeN8nResponse } from "@/lib/n8n/normalize-response";

const sessionId = "session-123";

describe("normalizeN8nResponse", () => {
  it.each([
    [{ output: "from output" }, "from output"],
    [{ text: "from text" }, "from text"],
    [{ message: "from message" }, "from message"],
    ["top-level text", "top-level text"],
    [[{ output: "array text" }], "array text"],
  ])("normalizes %o", (raw, content) => {
    expect(normalizeN8nResponse(raw, sessionId)).toEqual({
      sessionId,
      message: { role: "assistant", content },
    });
  });

  it("normalizes nested recommendations under a text key", () => {
    const response = normalizeN8nResponse(
      {
        output: {
          recommendations: [{ name: "Name" }, { name: "Name2" }],
        },
      },
      sessionId,
    );

    expect(response.message.content).toBe("1. Name\n2. Name2");
    expect(response.recommendations).toEqual([
      { name: "Name" },
      { name: "Name2" },
    ]);
  });

  it("keeps validated structured recommendation fields only", () => {
    const response = normalizeN8nResponse(
      {
        text: "Here are some partners.",
        recommendations: [
          {
            name: "Example Organization",
            score: 0.87,
            whyThisFits: "Shared mission",
            collaborationOpportunity: "Joint programming",
            strengths: ["Local reach"],
            considerations: ["Capacity"],
            evidenceQuality: "High",
            sources: [
              { title: "A source", url: "https://a.org" },
              "https://b.org",
              "javascript:alert(1)",
              { url: "ftp://x" },
            ],
            foo: "drop this",
          },
        ],
      },
      sessionId,
    );

    const recommendation = response.recommendations?.[0];
    expect(recommendation).toMatchObject({
      name: "Example Organization",
      score: 0.87,
      whyThisFits: "Shared mission",
      collaborationOpportunity: "Joint programming",
      strengths: ["Local reach"],
      considerations: ["Capacity"],
      evidenceQuality: "high",
    });
    expect(recommendation?.sources).toHaveLength(2);
    expect(recommendation).not.toHaveProperty("foo");
    expect(JSON.stringify(recommendation)).not.toContain("[object Object]");
    expect(Object.values(recommendation ?? {})).not.toContain(undefined);
  });

  it("synthesizes content from recommendations when text is absent", () => {
    const response = normalizeN8nResponse(
      {
        recommendations: [{ name: "Name" }, { name: "Name2" }],
      },
      sessionId,
    );

    expect(response.message.content).toBe("1. Name\n2. Name2");
  });

  it("rejects a recommendation without a name", () => {
    expect(() =>
      normalizeN8nResponse({ recommendations: [{ summary: "Missing name" }] }, sessionId),
    ).toThrowError(N8nError);
    expect(() =>
      normalizeN8nResponse({ recommendations: [{ summary: "Missing name" }] }, sessionId),
    ).toThrowError(/malformed|organization name/i);
  });

  it("rejects non-array recommendations", () => {
    expect(() =>
      normalizeN8nResponse({ text: "text", recommendations: {} }, sessionId),
    ).toThrowError(N8nError);
  });

  it.each([{}, [], 42, null, "", { output: "" }])(
    "rejects unsupported response %o",
    (raw) => {
      expect(() => normalizeN8nResponse(raw, sessionId)).toThrowError(N8nError);
    },
  );

  it("does not stringify an unrecognized nested object", () => {
    expect(() =>
      normalizeN8nResponse({ output: { foo: 1 } }, sessionId),
    ).toThrowError(N8nError);
    try {
      normalizeN8nResponse({ output: { foo: 1 } }, sessionId);
    } catch (error) {
      expect(error).toBeInstanceOf(N8nError);
      expect((error as Error).message).not.toContain("[object Object]");
    }
  });
});

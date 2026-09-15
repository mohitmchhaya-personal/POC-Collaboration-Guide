import { describe, expect, it } from "vitest";

import { createMockTransport } from "@/lib/chat/mock-transport";

describe("createMockTransport", () => {
  it.each([
    [
      "Find partners for a youth mental-health program in Los Angeles.",
      "Bright Harbor Youth Wellness",
    ],
    [
      "Who could complement our food insecurity programs?",
      "Common Table Neighbors",
    ],
    [
      "Find organizations that could help us expand services to veterans.",
      "Northstar Service Circle",
    ],
  ])("maps the suggested prompt to its fixture", async (message, marker) => {
    const sendMessage = createMockTransport({ delayMs: 0 });

    const response = await sendMessage({
      sessionId: "session-1",
      message,
    });

    expect(response.sessionId).toBe("session-1");
    expect(response.message.role).toBe("assistant");
    expect(response.message.content.length).toBeGreaterThan(0);
    expect(response.message.content).toContain(marker);
  });
});

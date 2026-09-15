import { describe, expect, it } from "vitest";

import { createMockTransport } from "@/lib/chat/mock-transport";

describe("createMockTransport", () => {
  it("returns a keyword-selected fixture without network access", async () => {
    const sendMessage = createMockTransport({ delayMs: 0 });

    const response = await sendMessage({
      sessionId: "session-1",
      message: "Please research food insecurity partners.",
    });

    expect(response.sessionId).toBe("session-1");
    expect(response.message.role).toBe("assistant");
    expect(response.message.content.length).toBeGreaterThan(0);
    expect(response.message.content).toContain("Common Table Neighbors");
  });
});

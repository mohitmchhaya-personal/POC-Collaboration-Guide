import type { Page } from "@playwright/test";

import type { ChatResponse } from "../../lib/chat/types";

type ChatCall = {
  message: string;
  sessionId: string;
};

type ChatError = {
  status: number;
  code: string;
};

type MockChatOptions = {
  delayMs?: number;
  respond: (body: ChatCall, callIndex: number) => ChatResponse | ChatError;
};

export const threeRecommendations: ChatResponse = {
  sessionId: "fixture-session",
  message: {
    role: "assistant",
    content: "Here are three potential collaboration partners.",
  },
  recommendations: [
    {
      name: "Org A",
      score: 88,
      sources: [{ title: "Org A profile", url: "https://example.org/org-a" }],
    },
    {
      name: "Org B",
      score: 76,
      sources: [{ title: "Org B profile", url: "https://example.org/org-b" }],
    },
    { name: "Org C" },
  ],
};

export const followUpText = "Santa Clarita follow-up response.";

export function mockChatApi(
  page: Page,
  { delayMs = 0, respond }: MockChatOptions,
): { calls: ChatCall[] } {
  const calls: ChatCall[] = [];

  void page.route("**/api/chat", async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() ?? "{}") as ChatCall;
    const callIndex = calls.length;
    calls.push(body);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const result = respond(body, callIndex);
    if ("status" in result) {
      await route.fulfill({
        status: result.status,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Mock error",
          code: result.code,
          requestId: `e2e-${callIndex}`,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });

  return { calls };
}

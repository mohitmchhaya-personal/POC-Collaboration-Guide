import type { ChatRequest, ChatResponse, SendChatMessage } from "./types";
import { chatFixtures } from "./fixtures";

type MockTransportOptions = {
  delayMs?: number;
};

function selectFixture(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("mental-health") ||
    normalized.includes("mental health") ||
    normalized.includes("youth")
  ) {
    return chatFixtures.mentalHealthYouth;
  }
  if (normalized.includes("food")) {
    return chatFixtures.foodInsecurity;
  }
  if (normalized.includes("veteran")) {
    return chatFixtures.veterans;
  }
  return chatFixtures.generalResearch;
}

export function createMockTransport(
  options: MockTransportOptions = {},
): SendChatMessage {
  const delayMs = options.delayMs ?? 600;

  return async (request: ChatRequest): Promise<ChatResponse> => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
    const fixture = selectFixture(request.message);
    return {
      sessionId: request.sessionId,
      message: fixture.message,
    };
  };
}

export const mockSendChatMessage: SendChatMessage = createMockTransport();

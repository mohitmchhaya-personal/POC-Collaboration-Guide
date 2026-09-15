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

  return async (
    request: ChatRequest,
    options = {},
  ): Promise<ChatResponse> => {
    if (options.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, delayMs);
      const abort = () => {
        clearTimeout(timeout);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };
      options.signal?.addEventListener("abort", abort, { once: true });
    });
    const fixture = selectFixture(request.message);
    return {
      sessionId: request.sessionId,
      message: fixture.message,
    };
  };
}

export const mockSendChatMessage: SendChatMessage = createMockTransport();

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearStoredConversation,
  loadStoredConversation,
  saveStoredConversation,
} from "@/lib/chat/storage";
import type { StoredConversation } from "@/lib/chat/types";

const conversation: StoredConversation = {
  sessionId: "session-1",
  messages: [
    { id: "message-1", role: "user", content: "Hello" },
    { id: "message-2", role: "assistant", content: "A response." },
  ],
};

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("conversation storage", () => {
  it("round-trips a valid conversation", () => {
    saveStoredConversation(conversation);

    expect(loadStoredConversation()).toEqual(conversation);
    clearStoredConversation();
    expect(loadStoredConversation()).toBeNull();
  });

  it("returns null for garbage and wrong shapes", () => {
    sessionStorage.setItem("spreadbliss.conversation.v1", "not json");
    expect(loadStoredConversation()).toBeNull();

    sessionStorage.setItem(
      "spreadbliss.conversation.v1",
      JSON.stringify({ sessionId: "session-1", messages: "wrong" }),
    );
    expect(loadStoredConversation()).toBeNull();

    sessionStorage.setItem(
      "spreadbliss.conversation.v1",
      JSON.stringify({
        sessionId: "session-1",
        messages: [{ id: "message-1", role: "user" }],
      }),
    );
    expect(loadStoredConversation()).toBeNull();

    sessionStorage.setItem(
      "spreadbliss.conversation.v1",
      JSON.stringify({
        sessionId: "invalid session",
        messages: [],
      }),
    );
    expect(loadStoredConversation()).toBeNull();
  });

  it("returns null when storage access throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(loadStoredConversation()).toBeNull();
  });
});

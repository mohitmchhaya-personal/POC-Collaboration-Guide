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

const recommendation = {
  name: "Example Partners",
  score: 82,
  sources: [{ url: "https://example.org/about" }],
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

  it("round-trips recommendations on assistant messages", () => {
    const withRecommendation: StoredConversation = {
      ...conversation,
      messages: [
        ...conversation.messages.slice(0, 1),
        {
          ...conversation.messages[1],
          recommendations: [recommendation],
        },
      ],
    };
    saveStoredConversation(withRecommendation);

    expect(loadStoredConversation()).toEqual(withRecommendation);
  });

  it("drops malformed recommendations but keeps the message", () => {
    sessionStorage.setItem(
      "spreadbliss.conversation.v1",
      JSON.stringify({
        sessionId: "session-1",
        messages: [
          {
            id: "message-1",
            role: "assistant",
            content: "A response.",
            recommendations: [{ name: "Invalid", score: "bad" }],
          },
        ],
      }),
    );

    expect(loadStoredConversation()).toEqual({
      sessionId: "session-1",
      messages: [
        { id: "message-1", role: "assistant", content: "A response." },
      ],
    });
  });

  it("strips unknown keys from stored recommendation sources", () => {
    sessionStorage.setItem(
      "spreadbliss.conversation.v1",
      JSON.stringify({
        sessionId: "session-1",
        messages: [
          {
            id: "message-1",
            role: "assistant",
            content: "A response.",
            recommendations: [
              {
                name: "Example Partners",
                sources: [
                  {
                    url: "https://example.org/about",
                    title: "About",
                    tracking: { campaign: "ignored" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    );

    expect(loadStoredConversation()).toEqual({
      sessionId: "session-1",
      messages: [
        {
          id: "message-1",
          role: "assistant",
          content: "A response.",
          recommendations: [
            {
              name: "Example Partners",
              sources: [{ url: "https://example.org/about", title: "About" }],
            },
          ],
        },
      ],
    });
  });
});

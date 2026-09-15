import { describe, expect, it } from "vitest";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/types";
import {
  isValidMessage,
  validateChatRequest,
} from "@/lib/chat/validation";

describe("chat request validation", () => {
  it("accepts and trims a valid request", () => {
    expect(
      validateChatRequest({ sessionId: "abc_123", message: "  Hello  " }),
    ).toEqual({
      ok: true,
      value: { sessionId: "abc_123", message: "Hello" },
    });
  });

  it("keeps isValidMessage behavior", () => {
    expect(isValidMessage("hello")).toBe(true);
    expect(isValidMessage("   ")).toBe(false);
  });

  it("rejects a missing message", () => {
    expect(validateChatRequest({ sessionId: "abc" })).toEqual({
      ok: false,
      error: "message is required.",
    });
    expect(validateChatRequest({ sessionId: "abc", message: null })).toEqual({
      ok: false,
      error: "message is required.",
    });
  });

  it("rejects a non-string message", () => {
    expect(validateChatRequest({ sessionId: "abc", message: 42 })).toEqual({
      ok: false,
      error: "message must be a string.",
    });
  });

  it("rejects a blank message", () => {
    expect(validateChatRequest({ sessionId: "abc", message: " \n " })).toEqual({
      ok: false,
      error: "message must not be blank.",
    });
  });

  it("accepts exactly 4000 characters and rejects 4001", () => {
    expect(
      validateChatRequest({
        sessionId: "abc",
        message: "x".repeat(MAX_MESSAGE_LENGTH),
      }),
    ).toMatchObject({ ok: true });
    expect(
      validateChatRequest({
        sessionId: "abc",
        message: "x".repeat(MAX_MESSAGE_LENGTH + 1),
      }),
    ).toEqual({
      ok: false,
      error: "message must be at most 4000 characters.",
    });
  });

  it("rejects a missing session id", () => {
    expect(validateChatRequest({ message: "hello" })).toEqual({
      ok: false,
      error: "sessionId is required.",
    });
    expect(validateChatRequest({ message: "hello", sessionId: null })).toEqual({
      ok: false,
      error: "sessionId is required.",
    });
  });

  it("rejects an invalid session id", () => {
    expect(
      validateChatRequest({ sessionId: "has spaces", message: "hello" }),
    ).toEqual({
      ok: false,
      error: "sessionId is invalid.",
    });
  });

  it("rejects non-object bodies", () => {
    expect(validateChatRequest(null)).toEqual({
      ok: false,
      error: "Request body must be a JSON object.",
    });
    expect(validateChatRequest([])).toEqual({
      ok: false,
      error: "Request body must be a JSON object.",
    });
  });
});

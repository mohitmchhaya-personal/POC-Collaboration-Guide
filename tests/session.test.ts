import { describe, expect, it } from "vitest";

import { createSessionId, isValidSessionId } from "@/lib/chat/session";
import { MAX_SESSION_ID_LENGTH } from "@/lib/chat/types";

describe("session utilities", () => {
  it("creates unique UUID session identifiers", () => {
    const first = createSessionId();
    const second = createSessionId();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second).not.toBe(first);
  });

  it.each(["session-123", "opaque_session", "ABC-123_xyz"])(
    "accepts safe opaque identifier %s",
    (value) => {
      expect(isValidSessionId(value)).toBe(true);
    },
  );

  it.each([
    "",
    "has spaces",
    "has.period",
    "has/slash",
    "x".repeat(MAX_SESSION_ID_LENGTH + 1),
    null,
    42,
    {},
  ])("rejects invalid identifier %o", (value) => {
    expect(isValidSessionId(value)).toBe(false);
  });
});

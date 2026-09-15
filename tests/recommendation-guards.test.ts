import { describe, expect, it } from "vitest";

import {
  parseRecommendations,
  pickRecommendation,
} from "@/lib/chat/recommendation-guards";

const fullRecommendation = {
  name: "Example Partners",
  score: 82,
  whyThisFits: "Shared mission.",
  collaborationOpportunity: "Coordinate outreach.",
  strengths: ["Strong local presence"],
  considerations: ["Capacity is limited"],
  evidenceQuality: "high",
  sources: [{ title: "About", url: "https://example.org/about" }],
};

describe("recommendation guards", () => {
  it("accepts a valid full recommendation", () => {
    expect(pickRecommendation(fullRecommendation)).toEqual(fullRecommendation);
  });

  it("rejects missing names and invalid field types", () => {
    expect(pickRecommendation({ score: 82 })).toBeNull();
    expect(pickRecommendation({ name: "Example", score: "82" })).toBeNull();
    expect(
      pickRecommendation({
        name: "Example",
        sources: [{ url: "javascript:alert(1)" }],
      }),
    ).toBeNull();
  });

  it("strips unknown keys while preserving known fields", () => {
    expect(
      pickRecommendation({ ...fullRecommendation, secret: "remove me" }),
    ).toEqual(fullRecommendation);
  });

  it("drops the whole array when any item is malformed", () => {
    expect(
      parseRecommendations([fullRecommendation, { name: "Invalid", score: "bad" }]),
    ).toBeUndefined();
  });

  it("returns undefined for empty and non-array values", () => {
    expect(parseRecommendations([])).toBeUndefined();
    expect(parseRecommendations({ name: "Example" })).toBeUndefined();
    expect(parseRecommendations(undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { describeResponseShape } from "@/lib/n8n/describe-shape";

describe("describeResponseShape", () => {
  it("describes strings without their content or length", () => {
    expect(describeResponseShape("secret text")).toEqual({ type: "string" });
  });

  it("keeps only safe object keys and counts the rest", () => {
    const result = describeResponseShape({
      output: "secret text",
      apiKey: "x",
      url: "https://h.example",
    });

    expect(result).toEqual({
      type: "object",
      keys: ["output"],
      otherKeyCount: 2,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("https");
    expect(serialized).not.toContain("x");
  });

  it("describes an array by length and first-item type only", () => {
    expect(describeResponseShape([{ a: 1 }])).toEqual({
      type: "array",
      length: 1,
      itemType: "object",
    });
    expect(describeResponseShape([])).toEqual({
      type: "array",
      length: 0,
    });
  });

  it.each([
    [null, { type: "null" }],
    [undefined, { type: "undefined" }],
    [42, { type: "number" }],
    [true, { type: "boolean" }],
  ])("describes %s safely", (value, expected) => {
    expect(describeResponseShape(value)).toEqual(expected);
  });
});

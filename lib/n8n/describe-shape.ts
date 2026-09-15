export type ShapeDescription = {
  type:
    | "string"
    | "number"
    | "boolean"
    | "null"
    | "undefined"
    | "array"
    | "object";
  length?: number;
  itemType?: ShapeDescription["type"];
  keys?: string[];
  otherKeyCount?: number;
};

export const SAFE_KEYS: ReadonlySet<string> = new Set([
  "output",
  "text",
  "message",
  "response",
  "answer",
  "recommendations",
  "candidates",
  "data",
  "result",
  "results",
  "items",
  "json",
  "error",
  "status",
  "success",
  "code",
]);

function describeType(value: unknown): ShapeDescription["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return "undefined";
}

export function describeResponseShape(value: unknown): ShapeDescription {
  if (Array.isArray(value)) {
    const description: ShapeDescription = {
      type: "array",
      length: value.length,
    };
    if (value.length > 0) {
      description.itemType = describeType(value[0]);
    }
    return description;
  }

  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const safeKeys = keys.filter((key) => SAFE_KEYS.has(key)).sort();
    const otherKeyCount = keys.length - safeKeys.length;
    const description: ShapeDescription = { type: "object" };
    if (safeKeys.length > 0) description.keys = safeKeys;
    if (otherKeyCount > 0) description.otherKeyCount = otherKeyCount;
    return description;
  }

  return { type: describeType(value) };
}

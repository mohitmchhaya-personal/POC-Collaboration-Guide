import { MAX_MESSAGE_LENGTH } from "./types";

export function isValidMessage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_MESSAGE_LENGTH
  );
}

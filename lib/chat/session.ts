import { MAX_SESSION_ID_LENGTH } from "./types";

export function createSessionId(): string {
  return crypto.randomUUID();
}

export function isValidSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_SESSION_ID_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

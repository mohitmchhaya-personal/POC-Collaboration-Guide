import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function filesUnder(relativeDirectory: string): string[] {
  const directory = path.join(root, relativeDirectory);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    return entry.isDirectory()
      ? filesUnder(relativePath)
      : [relativePath];
  });
}

function readFiles(relativeDirectory: string): string {
  return filesUnder(relativeDirectory)
    .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
}

describe("static security guardrails", () => {
  it("does not use public environment variables in application code", () => {
    expect(readFiles("app")).not.toContain("NEXT_PUBLIC_");
    expect(readFiles("components")).not.toContain("NEXT_PUBLIC_");
    expect(readFiles("lib")).not.toContain("NEXT_PUBLIC_");
  });

  it("does not expose n8n names in browser chat code", () => {
    expect(readFiles("components")).not.toContain("N8N_");
    expect(readFiles("lib/chat")).not.toContain("N8N_");
  });

  it("keeps environment files ignored except for the example", () => {
    const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env\*$/m);
    expect(gitignore).toMatch(/^!\.env\.example$/m);
  });

  it("keeps example credentials empty with the documented timeout", () => {
    const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
    expect(example).toMatch(/^N8N_CHAT_WEBHOOK_URL=$/m);
    expect(example).toMatch(/^N8N_CHAT_BASIC_AUTH_USER=$/m);
    expect(example).toMatch(/^N8N_CHAT_BASIC_AUTH_PASSWORD=$/m);
    expect(example).toMatch(/^N8N_REQUEST_TIMEOUT_MS=180000$/m);
  });

  it("does not use dangerous HTML injection in UI code", () => {
    expect(readFiles("components")).not.toContain("dangerouslySetInnerHTML");
    expect(readFiles("app")).not.toContain("dangerouslySetInnerHTML");
  });

  it("marks server environment and n8n client modules server-only", () => {
    expect(
      fs.readFileSync(path.join(root, "lib/env.ts"), "utf8"),
    ).toContain('import "server-only"');
    expect(
      fs.readFileSync(path.join(root, "lib/n8n/client.ts"), "utf8"),
    ).toContain('import "server-only"');
  });
});

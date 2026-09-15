import "@testing-library/jest-dom/vitest";

for (const key of Object.keys(process.env)) {
  if (key.startsWith("N8N_")) delete process.env[key];
}

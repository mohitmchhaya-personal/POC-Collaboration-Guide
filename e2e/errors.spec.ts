import { expect, test } from "@playwright/test";

import { mockChatApi } from "./helpers/mock-chat";

test("shows a safe timeout error and retries without duplicating the user message", async ({
  page,
}) => {
  const { calls } = await mockChatApi(page, {
    respond: (body, callIndex) =>
      callIndex === 0
        ? { status: 504, code: "upstream_timeout" }
        : {
            sessionId: body.sessionId,
            message: { role: "assistant", content: "Retry succeeded." },
          },
  });

  await page.goto("/");
  const prompt =
    "Find partners for a youth mental-health program in Los Angeles.";
  await page.getByRole("button", { name: prompt }).click();
  await expect(
    page.getByRole("alert").filter({
      hasText: "Research took longer than expected. Please try again.",
    }),
  ).toContainText(
    "Research took longer than expected. Please try again.",
  );
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Retry succeeded.")).toBeVisible();

  expect(calls).toHaveLength(2);
  expect(calls[1]?.sessionId).toBe(calls[0]?.sessionId);
  await expect(
    page.getByRole("listitem").filter({ hasText: prompt }),
  ).toHaveCount(1);
});

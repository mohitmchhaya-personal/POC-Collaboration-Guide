import { expect, test } from "@playwright/test";

import { mockChatApi, threeRecommendations } from "./helpers/mock-chat";

test("restores the transcript, recommendations, and session after refresh", async ({
  page,
}) => {
  const { calls } = await mockChatApi(page, {
    respond: (body, callIndex) =>
      callIndex === 0
        ? { ...threeRecommendations, sessionId: body.sessionId }
        : {
            sessionId: body.sessionId,
            message: { role: "assistant", content: "Follow-up restored." },
          },
  });

  await page.goto("/");
  const prompt =
    "Find partners for a youth mental-health program in Los Angeles.";
  await page.getByRole("button", { name: prompt }).click();
  await expect(page.getByRole("heading", { name: "Org A" })).toBeVisible();
  const sessionId = calls[0]?.sessionId;

  await page.reload();
  await expect(page.getByRole("heading", { name: "Org A" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Org B" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Org C" })).toBeVisible();

  const composer = page.getByRole("textbox", { name: "Message" });
  await composer.fill("Continue this research.");
  await composer.press("Enter");
  await expect(page.getByText("Follow-up restored.")).toBeVisible();
  expect(calls[1]?.sessionId).toBe(sessionId);
});

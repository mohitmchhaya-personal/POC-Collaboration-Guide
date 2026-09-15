import { expect, test } from "@playwright/test";

import {
  followUpText,
  mockChatApi,
  threeRecommendations,
} from "./helpers/mock-chat";

test("completes a desktop research conversation and resets sessions", async ({
  page,
}) => {
  const { calls } = mockChatApi(page, {
    delayMs: 1500,
    respond: (body, callIndex) => {
      if (callIndex === 0) {
        return { ...threeRecommendations, sessionId: body.sessionId };
      }
      if (callIndex === 1) {
        return {
          sessionId: body.sessionId,
          message: { role: "assistant", content: followUpText },
        };
      }
      return {
        sessionId: body.sessionId,
        message: { role: "assistant", content: "Fresh conversation response." },
      };
    },
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Find organizations you could accomplish more with.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Find partners for a youth mental-health program in Los Angeles.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Who could complement our food insecurity programs?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Find organizations that could help us expand services to veterans.",
    }),
  ).toBeVisible();

  const firstPrompt =
    "Find partners for a youth mental-health program in Los Angeles.";
  await page.getByRole("button", { name: firstPrompt }).click();
  await expect(page.getByText(firstPrompt)).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Researching and verifying potential partners…",
  );
  await expect(
    page.getByRole("heading", { name: "Org A" }),
  ).toBeVisible({ timeout: 10_000 });

  for (const name of ["Org A", "Org B", "Org C"]) {
    await expect(
      page.getByRole("heading", { name }),
    ).toBeVisible();
  }
  for (const name of ["Org A profile", "Org B profile"]) {
    const link = page.getByRole("link", { name: new RegExp(name) });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute(
      "rel",
      "noopener noreferrer nofollow",
    );
  }

  const composer = page.getByRole("textbox", { name: "Message" });
  await composer.fill("Focus only on Santa Clarita.");
  await composer.press("Enter");
  await expect(page.getByText(followUpText)).toBeVisible({ timeout: 10_000 });
  expect(calls[1]?.sessionId).toBe(calls[0]?.sessionId);
  expect(calls[0]?.sessionId).toMatch(/^[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Find organizations you could accomplish more with.",
    }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(0);

  await page.getByRole("button", { name: firstPrompt }).click();
  await expect(page.getByText("Fresh conversation response.")).toBeVisible({
    timeout: 10_000,
  });
  expect(calls[2]?.sessionId).not.toBe(calls[0]?.sessionId);
});

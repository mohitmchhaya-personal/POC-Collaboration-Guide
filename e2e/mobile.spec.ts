import { expect, test } from "@playwright/test";

import { mockChatApi } from "./helpers/mock-chat";

test("renders the chat flow without horizontal overflow on mobile", async ({
  page,
}) => {
  mockChatApi(page, {
    respond: (body) => ({
      sessionId: body.sessionId,
      message: { role: "assistant", content: "Mobile response." },
    }),
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Find organizations you could accomplish more with.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", {
    name: "Who could complement our food insecurity programs?",
  }).click();
  await expect(page.getByText("Mobile response.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
});

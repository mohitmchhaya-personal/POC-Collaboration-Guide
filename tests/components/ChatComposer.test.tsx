// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatComposer } from "@/components/chat/ChatComposer";

afterEach(cleanup);

describe("ChatComposer", () => {
  it("has an accessible message label and helper text", () => {
    render(<ChatComposer onSubmit={vi.fn()} disabled={false} />);

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Recommendations are based on available SpreadBliss data and public web research.",
      ),
    ).toBeInTheDocument();
  });

  it("disables send when empty and enables it after typing", async () => {
    const user = userEvent.setup();
    render(<ChatComposer onSubmit={vi.fn()} disabled={false} />);
    const send = screen.getByRole("button", { name: "Send message" });
    const textarea = screen.getByLabelText("Message");

    expect(send).toBeDisabled();
    await user.type(textarea, "Hello");
    expect(send).toBeEnabled();
  });

  it("submits trimmed text on Enter and clears the textarea", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatComposer onSubmit={onSubmit} disabled={false} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "  Find partners  ");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("Find partners");
    expect(textarea).toHaveValue("");
  });

  it("inserts a newline with Shift+Enter without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatComposer onSubmit={onSubmit} disabled={false} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "First");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "Second");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("First\nSecond");
  });

  it("disables send while disabled", async () => {
    const user = userEvent.setup();
    render(<ChatComposer onSubmit={vi.fn()} disabled />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "Hello");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
});

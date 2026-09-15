// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatShell } from "@/components/chat/ChatShell";
import { SUGGESTED_PROMPTS } from "@/components/chat/EmptyState";
import type { ChatResponse, SendChatMessage } from "@/lib/chat/types";

afterEach(cleanup);

function response(content: string): ChatResponse {
  return {
    sessionId: "fixture-session",
    message: { role: "assistant", content },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("ChatShell", () => {
  it("sends a suggested prompt and renders the assistant response", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("A research report."));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );

    expect(
      screen.getByText(SUGGESTED_PROMPTS[0]),
    ).toBeInTheDocument();
    expect(await screen.findByText("A research report.")).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls[0]?.[0]).toMatchObject({
      sessionId: expect.any(String),
      message: SUGGESTED_PROMPTS[0],
    });
  });

  it("sends typed text through the same transport", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("Typed response."));
    render(<ChatShell sendMessage={sendMessage} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "  Typed question  ");
    await user.keyboard("{Enter}");
    await screen.findByText("Typed response.");

    expect(sendMessage).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      message: "Typed question",
    });
  });

  it("shows loading while the transport is pending", async () => {
    const user = userEvent.setup();
    let resolve!: (value: ChatResponse) => void;
    const pending = new Promise<ChatResponse>((resolvePromise) => {
      resolve = resolvePromise;
    });
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[1] }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Researching potential partners…",
    );

    resolve(response("Done."));
    expect(await screen.findByText("Done.")).toBeInTheDocument();
  });

  it("shows an alert when the transport rejects", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockRejectedValue(new Error("mock failure"));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[2] }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("clears the transcript and creates a new session", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("First response."));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await screen.findByText("First response.");
    const firstSessionId = sendMessage.mock.calls[0]?.[0].sessionId;

    await user.click(screen.getByRole("button", { name: "New conversation" }));
    expect(
      screen.getByRole("heading", {
        name: "Find organizations you could accomplish more with.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("First response.")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[1] }),
    );
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    expect(sendMessage.mock.calls[1]?.[0].sessionId).not.toBe(firstSessionId);
  });

  it("never calls fetch", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("No network response."));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await screen.findByText("No network response.");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("ignores a stale success after starting a new conversation", async () => {
    const user = userEvent.setup();
    const pending = deferred<ChatResponse>();
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending.promise);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    expect(
      screen.getByRole("heading", {
        name: "Find organizations you could accomplish more with.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    pending.resolve(response("Stale assistant response."));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Stale assistant response.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "Find organizations you could accomplish more with.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Conversation" })).not.toBeInTheDocument();
  });

  it("ignores a stale rejection after starting a new conversation", async () => {
    const user = userEvent.setup();
    const pending = deferred<ChatResponse>();
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending.promise);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[1] }),
    );
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    pending.reject(new Error("stale failure"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", {
      name: "Find organizations you could accomplish more with.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Conversation" })).not.toBeInTheDocument();
  });

  it("uses a new session and renders a response after resetting a pending conversation", async () => {
    const user = userEvent.setup();
    const firstPending = deferred<ChatResponse>();
    const secondPending = deferred<ChatResponse>();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockReturnValueOnce(firstPending.promise)
      .mockReturnValueOnce(secondPending.promise);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    const firstSessionId = sendMessage.mock.calls[0]?.[0].sessionId;
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[2] }),
    );

    const secondSessionId = sendMessage.mock.calls[1]?.[0].sessionId;
    expect(secondSessionId).not.toBe(firstSessionId);

    secondPending.resolve(response("Fresh assistant response."));
    expect(
      await screen.findByText("Fresh assistant response."),
    ).toBeInTheDocument();
    firstPending.resolve(response("Stale assistant response."));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("Fresh assistant response.")).toBeInTheDocument();
  });
});

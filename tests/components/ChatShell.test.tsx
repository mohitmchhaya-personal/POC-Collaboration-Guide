// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatShell } from "@/components/chat/ChatShell";
import { SUGGESTED_PROMPTS } from "@/components/chat/EmptyState";
import type { ChatResponse, SendChatMessage } from "@/lib/chat/types";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

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

    expect(sendMessage).toHaveBeenCalledWith(
      {
        sessionId: expect.any(String),
        message: "Typed question",
      },
      { signal: expect.anything() },
    );
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
      "Researching potential collaboration opportunities…",
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
      "We couldn't complete that research request. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("uses the same session for a follow-up message", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValueOnce(response("First response."))
      .mockResolvedValueOnce(response("Second response."));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await screen.findByText("First response.");
    const firstSessionId = sendMessage.mock.calls[0]?.[0].sessionId;

    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "Follow-up question");
    await user.keyboard("{Enter}");
    await screen.findByText("Second response.");

    expect(sendMessage.mock.calls[1]?.[0].sessionId).toBe(firstSessionId);
  });

  it("prevents duplicate submissions while a request is pending", async () => {
    const user = userEvent.setup();
    const pending = deferred<ChatResponse>();
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending.promise);
    render(<ChatShell sendMessage={sendMessage} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "One request");
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");

    expect(sendMessage).toHaveBeenCalledOnce();
    pending.resolve(response("One response."));
    await screen.findByText("One response.");
  });

  it("retries a failed message without adding a duplicate user entry", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(response("Retried response."));
    render(<ChatShell sendMessage={sendMessage} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "Research this opportunity");
    await user.keyboard("{Enter}");
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Retried response.");

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[1]?.[0]).toEqual({
      sessionId: sendMessage.mock.calls[0]?.[0].sessionId,
      message: "Research this opportunity",
    });
    expect(
      screen.getAllByText("Research this opportunity"),
    ).toHaveLength(1);
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

  it("restores the transcript and session after a reload", async () => {
    const user = userEvent.setup();
    const firstSendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("Persisted response."));
    const firstRender = render(<ChatShell sendMessage={firstSendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await screen.findByText("Persisted response.");
    await waitFor(() =>
      expect(sessionStorage.getItem("spreadbliss.conversation.v1")).toContain(
        "Persisted response.",
      ),
    );
    const sessionId = firstSendMessage.mock.calls[0]?.[0].sessionId;
    firstRender.unmount();

    const secondSendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("Follow-up response."));
    render(<ChatShell sendMessage={secondSendMessage} />);
    expect(await screen.findByText("Persisted response.")).toBeInTheDocument();

    const textarea = screen.getByLabelText("Message");
    await user.type(textarea, "Continue research");
    await user.keyboard("{Enter}");
    await screen.findByText("Follow-up response.");

    expect(secondSendMessage.mock.calls[0]?.[0].sessionId).toBe(sessionId);
  });

  it("uses the API transport by default", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      async (...args: Parameters<typeof fetch>) => {
        void args;
        return new Response(
          JSON.stringify({
            sessionId: "api-session",
            message: { role: "assistant", content: "API response." },
          }),
          { status: 200 },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ChatShell />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    await screen.findByText("API response.");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });

  it("ignores a stale success after starting a new conversation", async () => {
    const user = userEvent.setup();
    const pending = deferred<ChatResponse>();
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending.promise);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    const signal = sendMessage.mock.calls[0]?.[1]?.signal;
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    expect(signal?.aborted).toBe(true);

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

// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatShell } from "@/components/chat/ChatShell";
import { SUGGESTED_PROMPTS } from "@/components/chat/EmptyState";
import { ChatTransportError } from "@/lib/chat/api-transport";
import type {
  ChatResponse,
  Recommendation,
  SendChatMessage,
} from "@/lib/chat/types";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function response(
  content: string,
  recommendations?: Recommendation[],
): ChatResponse {
  return {
    sessionId: "fixture-session",
    message: { role: "assistant", content },
    recommendations,
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
      "Researching and verifying potential partners…",
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

  it.each([
    [
      "timeout",
      new ChatTransportError("upstream timeout", 504, "http", "upstream_timeout"),
      "Research took longer than expected. Please try again.",
    ],
    [
      "busy",
      new ChatTransportError(
        "upstream busy",
        429,
        "http",
        "upstream_rate_limited",
      ),
      "The research service is busy. Please try again shortly.",
    ],
    [
      "unavailable",
      new ChatTransportError(
        "upstream unavailable",
        502,
        "http",
        "upstream_unavailable",
      ),
      "The research service is temporarily unavailable.",
    ],
    [
      "invalid response",
      new ChatTransportError("bad body", 200, "malformed"),
      "We couldn't process the research response.",
    ],
    [
      "network",
      new ChatTransportError("network detail", 0, "network"),
      "We couldn't reach the research service.",
    ],
  ])("shows the safe %s error message", async (_name, error, message) => {
    const user = userEvent.setup();
    const sendMessage = vi.fn<SendChatMessage>().mockRejectedValue(error);
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("aborts an in-flight request when unmounted without updating state", async () => {
    const user = userEvent.setup();
    const pending = deferred<ChatResponse>();
    const sendMessage = vi.fn<SendChatMessage>().mockReturnValue(pending.promise);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const rendered = render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    const signal = sendMessage.mock.calls[0]?.[1]?.signal;
    rendered.unmount();
    expect(signal?.aborted).toBe(true);

    pending.resolve(response("Unmounted response."));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("retries a timeout with the same session ID", async () => {
    const user = userEvent.setup();
    const sendMessage = vi
      .fn<SendChatMessage>()
      .mockRejectedValueOnce(
        new ChatTransportError("timeout", 504, "http", "upstream_timeout"),
      )
      .mockResolvedValueOnce(response("Retry succeeded."));
    render(<ChatShell sendMessage={sendMessage} />);
    const textarea = screen.getByLabelText("Message");

    await user.type(textarea, "Retry this request");
    await user.keyboard("{Enter}");
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Retry succeeded.");

    expect(sendMessage.mock.calls[1]?.[0].sessionId).toBe(
      sendMessage.mock.calls[0]?.[0].sessionId,
    );
  });

  it("sends a 4,000-character message verbatim", async () => {
    const user = userEvent.setup();
    const message = "x".repeat(4000);
    const sendMessage = vi.fn<SendChatMessage>().mockResolvedValue(
      response("Long response."),
    );
    render(<ChatShell sendMessage={sendMessage} />);

    const textarea = screen.getByLabelText("Message");
    fireEvent.change(textarea, {
      target: { value: message },
    });
    await user.click(textarea);
    await user.keyboard("{Enter}");
    await screen.findByText("Long response.");
    expect(sendMessage.mock.calls[0]?.[0].message).toBe(message);
  });

  it("does not send an empty or whitespace-only message", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn<SendChatMessage>();
    render(<ChatShell sendMessage={sendMessage} />);
    const textarea = screen.getByLabelText("Message");

    await user.click(textarea);
    await user.keyboard("{Enter}");
    fireEvent.change(textarea, { target: { value: "   " } });
    await user.keyboard("{Enter}");

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("renders a long assistant response", async () => {
    const user = userEvent.setup();
    const content = Array.from({ length: 3000 }, (_, index) => `word-${index}`).join(
      " ",
    );
    const sendMessage = vi.fn<SendChatMessage>().mockResolvedValue(response(content));
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );

    expect(await screen.findByRole("article")).toHaveTextContent("word-2999");
  });

  it("renders a very long source URL as a complete anchor", async () => {
    const user = userEvent.setup();
    const url = `https://example.org/${"a".repeat(1480)}`;
    const sendMessage = vi.fn<SendChatMessage>().mockResolvedValue(
      response("Source response.", [{ name: "Long URL Partner", sources: [{ url }] }]),
    );
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );

    expect(await screen.findByRole("link")).toHaveAttribute("href", url);
  });

  it("renders one and two recommendation cards", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn<SendChatMessage>()
      .mockResolvedValueOnce(
        response("One recommendation.", [{ name: "One Partner" }]),
      )
      .mockResolvedValueOnce(
        response("Two recommendations.", [
          { name: "Two Partner A" },
          { name: "Two Partner B" },
        ]),
      );
    render(<ChatShell sendMessage={sendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    expect(await screen.findByText("One Partner")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[1] }),
    );
    expect(await screen.findByText("Two Partner A")).toBeInTheDocument();
    expect(screen.getByText("Two Partner B")).toBeInTheDocument();
  });

  it.each(["Which city should we prioritize?", "Thanks for the update."])(
    "renders ordinary text without recommendation cards: %s",
    async (content) => {
      const user = userEvent.setup();
      const sendMessage = vi.fn<SendChatMessage>().mockResolvedValue(
        response(content),
      );
      render(<ChatShell sendMessage={sendMessage} />);

      await user.click(
        screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
      );

      expect(await screen.findByText(content)).toBeInTheDocument();
      expect(
        screen.queryByText("Recommended organizations"),
      ).not.toBeInTheDocument();
    },
  );

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
    await user.keyboard("{Enter}{Enter}{Enter}");

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

  it("renders and restores recommendations with the assistant response", async () => {
    const user = userEvent.setup();
    const recommendations: Recommendation[] = [
      { name: "Persisted Partner", score: 88 },
    ];
    const firstSendMessage = vi
      .fn<SendChatMessage>()
      .mockResolvedValue(response("Research with recommendations.", recommendations));
    const firstRender = render(<ChatShell sendMessage={firstSendMessage} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );
    expect(await screen.findByText("Persisted Partner")).toBeInTheDocument();
    await waitFor(() =>
      expect(sessionStorage.getItem("spreadbliss.conversation.v1")).toContain(
        "Persisted Partner",
      ),
    );
    firstRender.unmount();

    render(
      <ChatShell
        sendMessage={vi
          .fn<SendChatMessage>()
          .mockResolvedValue(response("Unused response."))}
      />,
    );
    expect(await screen.findByText("Persisted Partner")).toBeInTheDocument();
    expect(screen.getByText("Collaboration score")).toBeInTheDocument();
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

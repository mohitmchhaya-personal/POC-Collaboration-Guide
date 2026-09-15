"use client";

import { useEffect, useRef, useState } from "react";

import { sendChatMessageViaApi } from "@/lib/chat/api-transport";
import { createSessionId } from "@/lib/chat/session";
import {
  clearStoredConversation,
  loadStoredConversation,
  saveStoredConversation,
} from "@/lib/chat/storage";
import type {
  SendChatMessage,
  TranscriptMessage,
} from "@/lib/chat/types";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { Conversation } from "./Conversation";
import { EmptyState } from "./EmptyState";

type ChatShellProps = {
  sendMessage?: SendChatMessage;
};

export function ChatShell({
  sendMessage = sendChatMessageViaApi,
}: ChatShellProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = loadStoredConversation();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionId(stored.sessionId);
      setMessages(stored.messages);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (sessionId) {
      saveStoredConversation({ sessionId, messages });
    } else if (messages.length === 0) {
      clearStoredConversation();
    }
  }, [hydrated, messages, sessionId]);

  async function send(
    message: string,
    options: { appendUserMessage: boolean },
  ) {
    if (message.length === 0 || status === "loading") return;

    const generation = conversationRef.current;
    const activeSessionId = sessionId ?? createSessionId();
    if (sessionId === null) setSessionId(activeSessionId);
    if (options.appendUserMessage) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: message },
      ]);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setFailedMessage(null);

    try {
      const response = await sendMessage({
        sessionId: activeSessionId,
        message,
      }, { signal: controller.signal });
      if (generation !== conversationRef.current) return;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message.content,
        },
      ]);
      setStatus("idle");
    } catch (error: unknown) {
      if (generation !== conversationRef.current) return;
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus("error");
      setFailedMessage(message);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function submit(text: string) {
    const message = text.trim();
    if (message.length === 0) return;
    void send(message, { appendUserMessage: true });
  }

  function retry() {
    if (failedMessage) {
      void send(failedMessage, { appendUserMessage: false });
    }
  }

  function newConversation() {
    abortRef.current?.abort();
    conversationRef.current += 1;
    setSessionId(createSessionId());
    setMessages([]);
    setStatus("idle");
    setFailedMessage(null);
    clearStoredConversation();
    textareaRef.current?.focus();
  }

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-brand-white">
      <ChatHeader onNewConversation={newConversation} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-3xl px-4 sm:px-6">
          {messages.length === 0 ? (
            <EmptyState onSelect={submit} />
          ) : (
            <Conversation messages={messages} loading={status === "loading"} />
          )}
          {status === "error" ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 pb-6 text-sm text-red-700"
            >
              <span>
                We couldn&apos;t complete that research request. Please try
                again.
              </span>
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center rounded-lg border border-neutral-200 px-3 py-2 font-medium text-neutral-700 shadow-sm transition hover:border-brand-blue hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>
      </main>
      <ChatComposer
        onSubmit={submit}
        disabled={status === "loading"}
        textareaRef={textareaRef}
      />
    </div>
  );
}

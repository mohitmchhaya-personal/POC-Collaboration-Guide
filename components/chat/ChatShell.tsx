"use client";

import { useRef, useState } from "react";

import { createSessionId } from "@/lib/chat/session";
import { mockSendChatMessage } from "@/lib/chat/mock-transport";
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
  sendMessage = mockSendChatMessage,
}: ChatShellProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef(0);

  async function submit(text: string) {
    const message = text.trim();
    if (message.length === 0 || status === "loading") return;

    const generation = conversationRef.current;
    const activeSessionId = sessionId ?? createSessionId();
    if (sessionId === null) setSessionId(activeSessionId);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: message },
    ]);
    setStatus("loading");

    try {
      const response = await sendMessage({
        sessionId: activeSessionId,
        message,
      });
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
    } catch {
      if (generation !== conversationRef.current) return;
      setStatus("error");
    }
  }

  function newConversation() {
    conversationRef.current += 1;
    setSessionId(createSessionId());
    setMessages([]);
    setStatus("idle");
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
            <p role="alert" className="pb-6 text-sm text-red-700">
              Something went wrong. Please try again.
            </p>
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

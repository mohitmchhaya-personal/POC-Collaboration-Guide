import { useEffect, useRef } from "react";

import type { TranscriptMessage } from "@/lib/chat/types";
import { AssistantMessage } from "./AssistantMessage";
import { LoadingMessage } from "./LoadingMessage";
import { UserMessage } from "./UserMessage";

type ConversationProps = {
  messages: TranscriptMessage[];
  loading: boolean;
};

export function Conversation({ messages, loading }: ConversationProps) {
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length, loading]);

  return (
    <div aria-live="polite">
      <ol aria-label="Conversation" className="space-y-8 pb-8">
        {messages.map((message) =>
          message.role === "user" ? (
            <UserMessage key={message.id} content={message.content} />
          ) : (
            <AssistantMessage
              key={message.id}
              content={message.content}
              recommendations={message.recommendations}
            />
          ),
        )}
        {loading ? <LoadingMessage /> : null}
        <li ref={endRef} aria-hidden="true" />
      </ol>
    </div>
  );
}

import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ArrowUp } from "lucide-react";

import { MAX_MESSAGE_LENGTH } from "@/lib/chat/types";

type ChatComposerProps = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

const MAX_TEXTAREA_HEIGHT = 8 * 24;

export function ChatComposer({
  onSubmit,
  disabled,
  textareaRef,
}: ChatComposerProps) {
  const [value, setValue] = useState("");

  const resizeTextarea = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "auto";
    if (element.scrollHeight > 0) {
      element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea(textareaRef?.current ?? null);
  }, [resizeTextarea, textareaRef]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (disabled || trimmed.length === 0) return;
    onSubmit(trimmed);
    setValue("");
    resizeTextarea(textareaRef?.current ?? null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleChange(element: HTMLTextAreaElement) {
    setValue(element.value);
    resizeTextarea(element);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-neutral-200 bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-brand-blue focus-within:ring-offset-2">
          <textarea
            ref={textareaRef}
            id="chat-message"
            rows={1}
            value={value}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => handleChange(event.currentTarget)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about potential collaboration partners…"
            aria-describedby="chat-message-help"
            className="min-h-6 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-base leading-6 text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={disabled || value.trim().length === 0}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white transition hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
          >
            <ArrowUp aria-hidden="true" size={18} />
          </button>
        </div>
        <p id="chat-message-help" className="mt-2 px-2 text-xs text-neutral-500">
          Recommendations are based on available SpreadBliss data and public web
          research.
        </p>
      </div>
    </form>
  );
}

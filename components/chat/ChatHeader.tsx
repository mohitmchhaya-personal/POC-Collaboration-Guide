import { Plus } from "lucide-react";

type ChatHeaderProps = {
  onNewConversation: () => void;
};

export function ChatHeader({ onNewConversation }: ChatHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-black">SpreadBliss</p>
          <p className="truncate text-sm text-neutral-600">
            Collaboration Intelligence
          </p>
        </div>
        <button
          type="button"
          onClick={onNewConversation}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-brand-blue hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus aria-hidden="true" size={16} />
          <span>New conversation</span>
        </button>
      </div>
    </header>
  );
}

type SuggestedPromptProps = {
  text: string;
  onSelect: (text: string) => void;
};

export function SuggestedPrompt({ text, onSelect }: SuggestedPromptProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(text)}
      className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm leading-6 text-neutral-700 shadow-sm transition hover:border-brand-blue hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {text}
    </button>
  );
}

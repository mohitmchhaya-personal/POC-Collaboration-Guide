import { SuggestedPrompt } from "./SuggestedPrompt";

export const SUGGESTED_PROMPTS = [
  "Find mental health organizations serving youth in Los Angeles.",
  "Which organizations are working on food insecurity?",
  "Who could collaborate with veteran-serving organizations?",
] as const;

type EmptyStateProps = {
  onSelect: (text: string) => void;
};

export function EmptyState({ onSelect }: EmptyStateProps) {
  return (
    <section className="flex min-h-full flex-col justify-center py-12">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-gold">
        SpreadBliss
      </p>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-brand-black sm:text-4xl">
        Find organizations you could accomplish more with.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
        Discover and research potential nonprofit collaboration partners.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <SuggestedPrompt key={prompt} text={prompt} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

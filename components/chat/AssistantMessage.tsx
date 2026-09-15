import { Sparkles } from "lucide-react";

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <li>
      <article className="w-full break-words">
        <header className="flex items-center gap-2 text-sm font-medium text-brand-gold">
          <Sparkles aria-hidden="true" size={15} />
          <span>Assistant</span>
        </header>
        <div className="mt-3 space-y-5 text-base leading-7 text-neutral-800">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 12)}`} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </li>
  );
}

import { Sparkles } from "lucide-react";
import { useId } from "react";

import { looksLikeMarkdown } from "@/lib/chat/markdown";
import type { Recommendation } from "@/lib/chat/types";
import { MarkdownContent } from "./MarkdownContent";
import { RecommendationCard } from "./RecommendationCard";

export type AssistantMessageProps = {
  content: string;
  recommendations?: Recommendation[];
};

export function AssistantMessage({
  content,
  recommendations,
}: AssistantMessageProps) {
  const paragraphs = content.split(/\n\s*\n/);
  const recommendationsHeadingId = useId();
  const markdown = looksLikeMarkdown(content);

  return (
    <li>
      <article className="w-full break-words">
        <header className="flex items-center gap-2 text-sm font-medium text-brand-gold">
          <Sparkles aria-hidden="true" size={15} />
          <span>Assistant</span>
        </header>
        {markdown ? (
          <div className="mt-3 space-y-5 text-base leading-7 text-neutral-800">
            <MarkdownContent content={content} />
          </div>
        ) : (
          <div className="mt-3 space-y-5 text-base leading-7 text-neutral-800">
            {paragraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 12)}`}
                className="whitespace-pre-wrap"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}
        {recommendations?.length ? (
          <section
            className="mt-7 space-y-3"
            aria-labelledby={recommendationsHeadingId}
          >
            <h3
              id={recommendationsHeadingId}
              className="text-xs font-medium uppercase tracking-wide text-brand-gold"
            >
              Recommended organizations
            </h3>
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.name}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </li>
  );
}

import type { Recommendation } from "@/lib/chat/types";
import { isHttpUrl } from "@/lib/chat/recommendation-guards";
import { ExternalLinkAnchor } from "./ExternalLinkAnchor";

type RecommendationCardProps = {
  recommendation: Recommendation;
};

function TextSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h5 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </h5>
      {children}
    </section>
  );
}

function ListSection({ label, items }: { label: string; items: string[] }) {
  const visibleItems = items.filter((item) => item.length > 0);
  if (visibleItems.length === 0) return null;
  return (
    <TextSection label={label}>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-neutral-700">
        {visibleItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </TextSection>
  );
}

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const sources = recommendation.sources?.filter((source) =>
    isHttpUrl(source.url),
  );

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold text-brand-black">{recommendation.name}</h4>
        {recommendation.score !== undefined ? (
          <p className="text-sm text-neutral-700">
            Collaboration score{" "}
            <span className="font-semibold text-brand-black">
              {recommendation.score}
            </span>
          </p>
        ) : null}
      </header>
      {recommendation.evidenceQuality ? (
        <p className="mt-2 text-sm text-neutral-700">
          Evidence quality: {recommendation.evidenceQuality}
        </p>
      ) : null}
      <div className="mt-4 space-y-4">
        {recommendation.whyThisFits ? (
          <TextSection label="Why this fits">
            <p className="text-sm leading-6 text-neutral-700">
              {recommendation.whyThisFits}
            </p>
          </TextSection>
        ) : null}
        {recommendation.collaborationOpportunity ? (
          <TextSection label="Potential collaboration">
            <p className="text-sm leading-6 text-neutral-700">
              {recommendation.collaborationOpportunity}
            </p>
          </TextSection>
        ) : null}
        {recommendation.strengths ? (
          <ListSection label="Strengths" items={recommendation.strengths} />
        ) : null}
        {recommendation.considerations ? (
          <ListSection
            label="Considerations"
            items={recommendation.considerations}
          />
        ) : null}
        {sources && sources.length > 0 ? (
          <TextSection label="Sources">
            <ul className="space-y-1.5 text-sm leading-6">
              {sources.map((source) => (
                <li key={source.url}>
                  <ExternalLinkAnchor
                    href={source.url}
                  >
                    {source.title ?? new URL(source.url).hostname}
                  </ExternalLinkAnchor>
                </li>
              ))}
            </ul>
          </TextSection>
        ) : null}
      </div>
    </article>
  );
}

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

type ExternalLinkAnchorProps = {
  href: string;
  children: ReactNode;
};

export function ExternalLinkAnchor({
  href,
  children,
}: ExternalLinkAnchorProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="break-all text-brand-blue underline underline-offset-2 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {children}
      <ExternalLink aria-hidden="true" className="ml-1 inline-block" size={14} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

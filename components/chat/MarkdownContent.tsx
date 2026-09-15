import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { isHttpUrl } from "@/lib/chat/recommendation-guards";
import { ExternalLinkAnchor } from "./ExternalLinkAnchor";

const components: Components = {
  h1: ({ children }) => (
    <h3 className="text-xl font-semibold leading-8 text-brand-black">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-xl font-semibold leading-8 text-brand-black">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-lg font-semibold leading-7 text-brand-black">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h4 className="text-lg font-semibold leading-7 text-brand-black">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  a: ({ href, children }) =>
    isHttpUrl(href) ? (
      <ExternalLinkAnchor href={href}>{children}</ExternalLinkAnchor>
    ) : (
      <span>{children}</span>
    ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-neutral-200 text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-neutral-50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-neutral-200 px-3 py-2 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-neutral-200 px-3 py-2">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand-gold pl-4 italic text-neutral-600">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-4 text-sm">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-neutral-200" />,
  br: () => <br />,
};

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  const contentWithEscapedHtml = content.replace(
    /<(?=\/?[A-Za-z][^>]*>)/g,
    "&lt;",
  );

  return (
    <ReactMarkdown
      allowedElements={[
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "a",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "blockquote",
        "code",
        "pre",
        "hr",
        "br",
      ]}
      unwrapDisallowed
      skipHtml
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {contentWithEscapedHtml}
    </ReactMarkdown>
  );
}

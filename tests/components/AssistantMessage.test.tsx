// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AssistantMessage } from "@/components/chat/AssistantMessage";
import type { Recommendation } from "@/lib/chat/types";

afterEach(cleanup);

describe("AssistantMessage", () => {
  it("renders long-form content as separate plain-text paragraphs", () => {
    render(
      <AssistantMessage content={"First paragraph.\n\nSecond paragraph."} />,
    );

    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Assistant")).toBeInTheDocument();
  });

  it("never renders object stringification", () => {
    render(
      <AssistantMessage content="Research results are available as plain text." />,
    );

    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });

  it("renders safe GFM Markdown and external links", () => {
    render(
      <AssistantMessage
        content={`# Research summary

**Bold finding**

1. First step
2. Second step

- One
- Two

| Partner | Focus |
| --- | --- |
| Example | Housing |

[Read the source](https://example.org/report)`}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Research summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bold finding")).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Read the source/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(link).toHaveTextContent("(opens in a new tab)");
  });

  it("does not create anchors for unsafe Markdown URLs", () => {
    render(<AssistantMessage content="[x](javascript:alert(1))" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("[x](javascript:alert(1))")).toBeInTheDocument();
  });

  it("does not render raw HTML elements", () => {
    const { container } = render(
      <AssistantMessage
        content={`# Safe text

<script>alert(1)</script>

<img src="x" onerror="alert(1)" />`}
      />,
    );

    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.textContent).toContain("alert(1)");
    expect(container.textContent).toContain("onerror");
  });

  it("renders all paragraphs in a long response", () => {
    const content = Array.from(
      { length: 100 },
      (_, index) => `Paragraph ${index} with enough readable text.`,
    ).join("\n\n");
    const { container } = render(<AssistantMessage content={content} />);

    expect(container.querySelectorAll("article > div > p")).toHaveLength(100);
  });

  it("renders structured recommendations", () => {
    const recommendations: Recommendation[] = [
      { name: "First Partners", score: 82, evidenceQuality: "high" },
      { name: "Second Partners", whyThisFits: "Shared mission." },
      {
        name: "Third Partners",
        strengths: ["Local reach"],
        considerations: ["Limited capacity"],
      },
    ];
    render(
      <AssistantMessage
        content="A plain research response."
        recommendations={recommendations}
      />,
    );

    expect(screen.getByText("Recommended organizations")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByText("First Partners")).toBeInTheDocument();
    expect(screen.getByText("Second Partners")).toBeInTheDocument();
    expect(screen.getByText("Third Partners")).toBeInTheDocument();
  });

  it("omits empty recommendation sections and uses source fallbacks", () => {
    render(
      <AssistantMessage
        content="A plain research response."
        recommendations={[
          {
            name: "No Score Partner",
            sources: [
              { title: "Named source", url: "https://example.org/named" },
              { url: "https://example.net/fallback" },
            ],
          },
        ]}
      />,
    );

    const card = screen.getByText("No Score Partner").closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).queryByText("Collaboration score"),
    ).not.toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText("Sources"),
    ).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByRole("link", { name: /Named source/ }),
    ).toHaveAttribute("href", "https://example.org/named");
    expect(
      within(card as HTMLElement).getByRole("link", { name: /example.net/ }),
    ).toHaveAttribute("href", "https://example.net/fallback");
    expect(
      within(card as HTMLElement).getAllByRole("link"),
    ).toHaveLength(2);
  });
});

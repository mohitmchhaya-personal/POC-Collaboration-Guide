// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AssistantMessage } from "@/components/chat/AssistantMessage";

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
});

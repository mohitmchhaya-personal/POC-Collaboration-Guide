// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EmptyState,
  SUGGESTED_PROMPTS,
} from "@/components/chat/EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the heading, supporting text, and suggested prompts", () => {
    render(<EmptyState onSelect={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "Find organizations you could accomplish more with.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Explore potential nonprofit collaboration partners based on mission, geography, programs, populations served, and complementary capabilities.",
      ),
    ).toBeInTheDocument();
    for (const prompt of SUGGESTED_PROMPTS) {
      expect(screen.getByRole("button", { name: prompt })).toBeInTheDocument();
    }
  });

  it("passes the selected prompt to onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EmptyState onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: SUGGESTED_PROMPTS[0] }),
    );

    expect(onSelect).toHaveBeenCalledWith(SUGGESTED_PROMPTS[0]);
  });
});

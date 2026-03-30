// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { App } from "../App";

describe("dashboard shell", () => {
  it("renders the app shell navigation and top controls", async () => {
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: /primary/i });
    const activeRegion = screen.getByRole("main", { name: /active page region/i });

    expect(within(navigation).getAllByRole("button")).toHaveLength(6);
    expect(within(navigation).getByRole("button", { name: /总览/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByLabelText(/scenario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preset/i)).toBeInTheDocument();
    expect(within(activeRegion).getByRole("heading", { name: "总览" })).toBeInTheDocument();
  });
});

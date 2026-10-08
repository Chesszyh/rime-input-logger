// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import "../test/setup";
import { render, screen } from "@testing-library/react";
import { DemoApp as App } from "../DemoApp";

describe("web dashboard scaffold", () => {
  it("renders the product shell title", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /personal input analytics/i })
    ).toBeInTheDocument();
  });
});

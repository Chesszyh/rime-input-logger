// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { App } from "../App";

describe("dashboard controls", () => {
  it("switches scenario and preset from the app shell", async () => {
    render(<App />);

    expect(await screen.findByText("近 7 天")).toBeInTheDocument();
    expect((await screen.findAllByLabelText("READY")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "empty-history" }
    });

    expect((await screen.findAllByLabelText("NO_DATA")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/可以先导入样例数据/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/preset/i), {
      target: { value: "last-30-days" }
    });

    await waitFor(() => {
      expect(screen.getByText("近 30 天")).toBeInTheDocument();
    });

    const activeRegion = screen.getByRole("main", { name: /active page region/i });
    expect(within(activeRegion).getByText(/current status/i)).toBeInTheDocument();
  });
});

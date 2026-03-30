// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../App";

describe("dashboard controls", () => {
  it("switches scenario and preset from the app shell", async () => {
    render(<App />);

    expect(await screen.findByText("近 7 天")).toBeInTheDocument();
    expect(await screen.findByText("READY")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "empty-history" }
    });

    expect(await screen.findByText("NO_DATA")).toBeInTheDocument();
    expect(
      screen.getByText(/可以先导入样例数据/)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/preset/i), {
      target: { value: "last-30-days" }
    });

    await waitFor(() => {
      expect(screen.getByText("近 30 天")).toBeInTheDocument();
    });
    expect(screen.getByText(/current status/i)).toBeInTheDocument();
  });
});

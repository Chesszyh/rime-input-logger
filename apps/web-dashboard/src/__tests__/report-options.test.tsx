// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { App } from "../App";

describe("lexicon and report pages", () => {
  it("renders lexicon details and updates report preview when options change", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /词库/i }));
    expect(await screen.findByText("词库总览")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "词库条目" });
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1);

    fireEvent.change(screen.getByLabelText(/lexicon category/i), {
      target: { value: "phrase" }
    });

    await waitFor(() => {
      expect(screen.getByText("当前分类：短语")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /报告/i }));
    expect(await screen.findByText("报告预览")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/hide terms in report/i));

    await waitFor(() => {
      expect(screen.getByText("输入分析")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/hide terms in report/i));

    await waitFor(() => {
      expect(screen.getAllByText("[已隐藏]").length).toBeGreaterThan(0);
    });
  });
});

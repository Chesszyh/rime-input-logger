// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DemoApp as App } from "../DemoApp";

describe("web dashboard empty states", () => {
  it("keeps empty-history readable across overview and lexicon pages", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "empty-history" }
    });

    expect(await screen.findByText("当前页面暂无可展示数据")).toBeInTheDocument();
    expect(screen.getAllByText(/暂无数据/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /词库/i }));

    await waitFor(() => {
      expect(screen.getByText("词库总览")).toBeInTheDocument();
    });
    expect(screen.getByText("当前分类：全部")).toBeInTheDocument();
    expect(screen.getByText("暂无词条")).toBeInTheDocument();
  });
});

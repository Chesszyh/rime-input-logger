// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../App";

describe("primary analytics pages", () => {
  it("renders overview, stats, vocabulary, and time pages for normal-day", async () => {
    render(<App />);

    expect(await screen.findByText("输入字数")).toBeInTheDocument();
    expect(screen.getByText("活跃天数")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /统计/i }));
    expect(await screen.findByText("输入趋势图")).toBeInTheDocument();
    expect(screen.getByText("会话次数")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /词汇/i }));
    expect(await screen.findByText("高频词榜")).toBeInTheDocument();
    expect(screen.getAllByText("词云展示区").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /时间/i }));
    expect(await screen.findByText("活跃时段图")).toBeInTheDocument();
    expect(screen.getAllByText("热力图展示").length).toBeGreaterThan(0);
  });
});

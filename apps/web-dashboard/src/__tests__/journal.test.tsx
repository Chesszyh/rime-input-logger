// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../test/setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { App } from "../App";

const example = {
  source: "example",
  rawDir: "/example/raw",
  exists: true,
  dates: ["2026-06-08"],
  date: "2026-06-08",
  events: {
    generatedAt: "2026-06-08T12:00:00+08:00",
    entries: [
      {
        occurredAt: "2026-06-08T11:00:00+08:00",
        text: "输入分析",
        charCount: 4,
        schemaId: "demo",
      },
      {
        occurredAt: "2026-06-08T12:00:00+08:00",
        text: "Rime example",
        charCount: 12,
        schemaId: "demo",
      },
    ],
  },
  report: {
    totals: { tokens: 3 },
    source: { parseErrors: [] },
    wordCloud: [{ term: "输入分析", count: 2, share: 0.5 }],
  },
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => example }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("journal dashboard", () => {
  it("shows real event text, search and frequency cloud", async () => {
    render(<App />);
    await screen.findByText("Rime example");
    fireEvent.change(screen.getByLabelText("搜索输入"), {
      target: { value: "Rime" },
    });
    expect(screen.queryByText("输入分析")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /词云/ }));
    expect(screen.getByLabelText("输入分析 2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("日期"), {
      target: { value: "2026-06-07" },
    });
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("date=2026-06-07"),
        expect.anything(),
      ),
    );
  });

  it("offers onboarding for empty logs and persists a custom raw directory", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...example,
        exists: false,
        events: { ...example.events, entries: [] },
      }),
    } as Response);
    render(<App />);
    await screen.findByText("开始记录你的第一句话");
    fireEvent.click(screen.getByRole("button", { name: "体验示例数据" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("source=example"),
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /数据设置/ }));
    fireEvent.change(screen.getByLabelText("日志目录"), {
      target: { value: "/custom/raw" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存并读取" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("rawDir=%2Fcustom%2Fraw"),
        expect.anything(),
      ),
    );
    expect(localStorage.getItem("rime-raw-dir")).toBe("/custom/raw");
  });

  it("refreshes every five seconds without clearing the current view", async () => {
    vi.useFakeTimers();
    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Rime example")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Rime example")).toBeInTheDocument();
    cleanup();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("displays English-only observations with an explicit label", async () => {
    const observed = {
      ...example.events.entries[0],
      text: "English observation",
      observed: true,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...example,
        events: { ...example.events, entries: [] },
        activity: {
          events: [{ kind: "english_observation" }],
          errors: [],
          timeline: [observed],
        },
      }),
    } as Response);
    render(<App />);
    await screen.findByText("English observation");
    expect(screen.getByText(/0 次上屏 · 1 次英文观察/)).toBeInTheDocument();
  });

  it("shows a server error and recovers on refresh", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "目录不可读" }),
    } as Response);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("目录不可读");
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await screen.findByText("Rime example");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import "../test/setup";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MetricGrid } from "../components/metric-grid";
import { ChartCard } from "../components/chart-card";
import { SimpleLineChart } from "../components/simple-line-chart";
import { SimpleBarChart } from "../components/simple-bar-chart";
import { HeatmapGrid } from "../components/heatmap-grid";
import { TagCloud } from "../components/tag-cloud";
import { LexiconTable } from "../components/lexicon-table";

describe("shared visualization components", () => {
  it("renders metric, chart, heatmap, tag cloud, and lexicon table primitives", () => {
    render(
      <div>
        <MetricGrid
          items={[
            { label: "输入字数", value: "1,240", detail: "较上周期 +12%" },
            { label: "活跃天数", value: "7", detail: "连续 7 天" }
          ]}
        />

        <ChartCard title="输入趋势" description="按天汇总的输入字数">
          <SimpleLineChart
            ariaLabel="输入趋势图"
            unit="字"
            points={[
              { label: "03-24", value: 120 },
              { label: "03-25", value: 180 },
              { label: "03-26", value: 150 }
            ]}
          />
        </ChartCard>

        <ChartCard title="高频词排行" description="Top 3 词汇">
          <SimpleBarChart
            ariaLabel="高频词排行图"
            unit="次"
            points={[
              { label: "输入法", value: 18 },
              { label: "词库", value: 12 },
              { label: "热力图", value: 9 }
            ]}
          />
        </ChartCard>

        <HeatmapGrid
          title="时间热力"
          description="最近两天 4 个时段的活跃热力"
          cells={[
            { xLabel: "03-29", yLabel: "09:00", value: 4 },
            { xLabel: "03-29", yLabel: "10:00", value: 7 },
            { xLabel: "03-30", yLabel: "09:00", value: 2 },
            { xLabel: "03-30", yLabel: "10:00", value: 9 }
          ]}
        />

        <TagCloud
          title="主题词云"
          points={[
            { label: "输入法", value: 24 },
            { label: "词汇", value: 16 },
            { label: "报告", value: 8 }
          ]}
        />

        <LexiconTable
          title="词库预览"
          rows={[
            {
              id: "lex-1",
              term: "输入法",
              normalizedTerm: "输入法",
              category: "general",
              usageCount: 18,
              source: "analysis",
              firstSeenAt: "2026-03-24T08:00:00.000Z",
              lastSeenAt: "2026-03-30T08:00:00.000Z",
              status: "active",
              notes: "核心高频词"
            },
            {
              id: "lex-2",
              term: "热力图",
              normalizedTerm: "热力图",
              category: "phrase",
              usageCount: 9,
              source: "analysis",
              firstSeenAt: "2026-03-28T09:00:00.000Z",
              lastSeenAt: "2026-03-30T09:00:00.000Z",
              status: "active",
              notes: "短语词条"
            }
          ]}
        />
      </div>
    );

    expect(screen.getByText("输入字数")).toBeInTheDocument();
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("输入趋势")).toBeInTheDocument();
    expect(screen.getByLabelText("输入趋势图")).toBeInTheDocument();
    expect(screen.getByText("高频词排行")).toBeInTheDocument();
    expect(screen.getByLabelText("高频词排行图")).toBeInTheDocument();

    const heatmap = screen.getByRole("group", { name: "时间热力" });
    expect(within(heatmap).getAllByRole("listitem")).toHaveLength(4);

    const tagCloud = screen.getByRole("list", { name: "主题词云" });
    expect(within(tagCloud).getAllByRole("listitem")).toHaveLength(3);

    const table = screen.getByRole("table", { name: "词库预览" });
    expect(within(table).getByText("输入法")).toBeInTheDocument();
    expect(within(table).getByText("热力图")).toBeInTheDocument();
  });
});

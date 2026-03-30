import type { OverviewDashboardPage } from "../../../../packages/dashboard/src/index";
import { MetricGrid } from "../components/metric-grid";
import { SectionCard } from "../components/section-card";

interface OverviewPageProps {
  page: OverviewDashboardPage;
}

export const OverviewPage = ({ page }: OverviewPageProps) => (
  <div className="page-stack">
    <SectionCard
      eyebrow="Overview"
      title={page.title}
      description={`当前范围：${page.rangeLabel}`}
    >
      <MetricGrid
        items={page.metrics.map((metric) => ({
          label: metric.label,
          value: `${metric.value}${metric.unit ?? ""}`,
          detail: metric.deltaLabel ?? undefined
        }))}
      />
    </SectionCard>

    <SectionCard
      eyebrow="Highlights"
      title="关键摘要"
      description="把当前周期最重要的输入信号压缩成可扫描的结论。"
    >
      <ul className="insight-list">
        {page.highlights.map((highlight, index) => (
          <li key={`${highlight}-${index}`} className="insight-list__item">
            {highlight}
          </li>
        ))}
      </ul>
    </SectionCard>
  </div>
);

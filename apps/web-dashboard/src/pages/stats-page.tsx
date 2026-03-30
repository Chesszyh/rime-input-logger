import type { StatsDashboardPage } from "../../../../packages/dashboard/src/index";
import { ChartCard } from "../components/chart-card";
import { MetricGrid } from "../components/metric-grid";
import { SimpleBarChart } from "../components/simple-bar-chart";
import { SimpleLineChart } from "../components/simple-line-chart";

interface StatsPageProps {
  page: StatsDashboardPage;
}

export const StatsPage = ({ page }: StatsPageProps) => (
  <div className="page-stack">
    <MetricGrid
      items={page.sessionCards.map((card) => ({
        label: card.label,
        value: `${card.value}${card.unit}`
      }))}
    />

    <div className="page-grid">
      <ChartCard title={page.trendChart.title} description={page.trendChart.description}>
        <SimpleLineChart
          ariaLabel={page.trendChart.title}
          unit={page.trendChart.unit}
          points={page.trendChart.points}
        />
      </ChartCard>

      <ChartCard title={page.volumeChart.title} description={page.volumeChart.description}>
        <SimpleBarChart
          ariaLabel={page.volumeChart.title}
          unit={page.volumeChart.unit}
          points={page.volumeChart.points}
        />
      </ChartCard>
    </div>
  </div>
);

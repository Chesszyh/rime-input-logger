import type { TimeDashboardPage } from "../../../../packages/dashboard/src/index";
import { ChartCard } from "../components/chart-card";
import { HeatmapGrid } from "../components/heatmap-grid";
import { MetricGrid } from "../components/metric-grid";
import { SimpleBarChart } from "../components/simple-bar-chart";

interface TimePageProps {
  page: TimeDashboardPage;
}

export const TimePage = ({ page }: TimePageProps) => (
  <div className="page-stack">
    <MetricGrid
      items={page.sessionCards.map((card) => ({
        label: card.label,
        value: `${card.value}${card.unit}`
      }))}
    />

    <div className="page-grid">
      <ChartCard title={page.hourlyChart.title} description={page.hourlyChart.description}>
        <SimpleBarChart
          ariaLabel={page.hourlyChart.title}
          unit={page.hourlyChart.unit}
          points={page.hourlyChart.points}
        />
      </ChartCard>

      <ChartCard title={page.heatmapChart.title} description={page.heatmapChart.description}>
        <HeatmapGrid
          title={page.heatmapChart.title}
          description={page.heatmapChart.description}
          cells={page.heatmapChart.points.map((point) => {
            const [xLabel, ...rest] = point.label.split(" ");

            return {
              xLabel,
              yLabel: rest.join(" "),
              value: point.value
            };
          })}
        />
      </ChartCard>
    </div>
  </div>
);

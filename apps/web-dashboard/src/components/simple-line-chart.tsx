interface ChartPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  ariaLabel: string;
  unit?: string;
  points: ChartPoint[];
}

const chartWidth = 320;
const chartHeight = 160;
const chartPadding = 20;

export const SimpleLineChart = ({ ariaLabel, unit, points }: SimpleLineChartProps) => {
  const values = points.map((point) => point.value);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const span = max - min || 1;
  const step = points.length > 1 ? (chartWidth - chartPadding * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = chartPadding + step * index;
    const y =
      chartHeight - chartPadding - ((point.value - min) / span) * (chartHeight - chartPadding * 2);

    return { x, y };
  });
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <figure className="simple-chart simple-chart--line" aria-label={ariaLabel}>
      <svg
        className="simple-chart__svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          className="simple-chart__baseline"
          x1={chartPadding}
          y1={chartHeight - chartPadding}
          x2={chartWidth - chartPadding}
          y2={chartHeight - chartPadding}
        />
        {coordinates.length > 1 ? (
          <polyline className="simple-chart__line" points={polyline} />
        ) : null}
        {coordinates.map(({ x, y }, index) => (
          <circle className="simple-chart__point" key={points[index]?.label ?? index} cx={x} cy={y} r="3.5" />
        ))}
      </svg>

      <figcaption className="simple-chart__legend">
        {unit ? <p className="simple-chart__unit">单位 {unit}</p> : null}
        <ol className="simple-chart__points">
          {points.map((point) => (
            <li className="simple-chart__point-row" key={point.label}>
              <span className="simple-chart__point-label">{point.label}</span>
              <strong className="simple-chart__point-value">
                {point.value}
                {unit ? <span className="simple-chart__point-unit">{unit}</span> : null}
              </strong>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
};

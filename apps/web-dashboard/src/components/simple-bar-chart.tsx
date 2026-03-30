interface ChartPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  ariaLabel: string;
  unit?: string;
  points: ChartPoint[];
}

const chartWidth = 320;
const chartHeight = 160;
const chartPadding = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const SimpleBarChart = ({ ariaLabel, unit, points }: SimpleBarChartProps) => {
  const max = points.reduce((currentMax, point) => Math.max(currentMax, point.value), 0) || 1;
  const usableHeight = chartHeight - chartPadding * 2;
  const usableWidth = chartWidth - chartPadding * 2;
  const barWidth = points.length > 0 ? usableWidth / points.length : 0;

  return (
    <figure className="simple-chart simple-chart--bar" aria-label={ariaLabel}>
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
        {points.map((point, index) => {
          const barHeight = clamp((point.value / max) * usableHeight, 2, usableHeight);
          const x = chartPadding + index * barWidth + barWidth * 0.15;
          const y = chartHeight - chartPadding - barHeight;

          return (
            <rect
              className="simple-chart__bar"
              key={point.label}
              x={x}
              y={y}
              width={barWidth * 0.7}
              height={barHeight}
              rx="6"
            />
          );
        })}
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

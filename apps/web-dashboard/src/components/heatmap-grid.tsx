interface HeatmapCell {
  xLabel: string;
  yLabel: string;
  value: number;
}

interface HeatmapGridProps {
  title: string;
  description?: string;
  cells: HeatmapCell[];
}

const intensityClass = (value: number, max: number) => {
  if (max <= 0) {
    return "heatmap-grid__cell--empty";
  }

  const ratio = value / max;
  if (ratio >= 0.85) return "heatmap-grid__cell--strong";
  if (ratio >= 0.6) return "heatmap-grid__cell--medium";
  if (ratio >= 0.3) return "heatmap-grid__cell--light";
  return "heatmap-grid__cell--soft";
};

export const HeatmapGrid = ({ title, description, cells }: HeatmapGridProps) => {
  const max = cells.reduce((currentMax, cell) => Math.max(currentMax, cell.value), 0);
  const slug = title.replace(/\s+/g, "-").toLowerCase();
  const titleId = `${slug}-title`;
  const descriptionId = description ? `${slug}-description` : undefined;

  return (
    <section className="heatmap-grid" role="group" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <h3 className="heatmap-grid__title" id={titleId}>
        {title}
      </h3>
      {description ? (
        <p className="heatmap-grid__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <ul className="heatmap-grid__cells" aria-label={title}>
        {cells.map((cell) => (
          <li
            className={`heatmap-grid__cell ${intensityClass(cell.value, max)}`}
            key={`${cell.xLabel}-${cell.yLabel}`}
            aria-label={`${cell.xLabel} ${cell.yLabel} ${cell.value}`}
          >
            <span className="heatmap-grid__cell-value">{cell.value}</span>
            <span className="heatmap-grid__cell-labels">
              <span>{cell.xLabel}</span>
              <span>{cell.yLabel}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

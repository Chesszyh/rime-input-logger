import type { ReactNode } from "react";

export interface MetricGridItem {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
}

interface MetricGridProps {
  items: MetricGridItem[];
}

export const MetricGrid = ({ items }: MetricGridProps) => (
  <dl className="metric-grid" aria-label="Metrics">
    {items.map((item, index) => (
      <div className="metric-grid__item" key={`${String(item.label)}-${index}`}>
        <dt className="metric-grid__label">{item.label}</dt>
        <dd className="metric-grid__value">{item.value}</dd>
        {item.detail ? <p className="metric-grid__detail">{item.detail}</p> : null}
      </div>
    ))}
  </dl>
);

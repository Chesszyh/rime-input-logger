import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const ChartCard = ({ title, description, children }: ChartCardProps) => {
  const slug = title.replace(/\s+/g, "-").toLowerCase();
  const titleId = `${slug}-title`;
  const descriptionId = description ? `${slug}-description` : undefined;

  return (
    <section className="chart-card" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <header className="chart-card__header">
        <div className="chart-card__heading">
          <h3 className="chart-card__title" id={titleId}>
            {title}
          </h3>
          {description ? (
            <p className="chart-card__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div className="chart-card__body">{children}</div>
    </section>
  );
};

import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export const SectionCard = ({
  title,
  description,
  eyebrow,
  actions,
  badge,
  children
}: SectionCardProps) => (
  <article className="section-card">
    <header className="section-card__header">
      <div className="section-card__heading">
        {eyebrow ? <p className="section-card__eyebrow">{eyebrow}</p> : null}
        <div className="section-card__title-row">
          <h2 className="section-card__title">{title}</h2>
          {badge ? <div className="section-card__badge">{badge}</div> : null}
        </div>
        {description ? <p className="section-card__description">{description}</p> : null}
      </div>
      {actions ? <div className="section-card__actions">{actions}</div> : null}
    </header>
    <div className="section-card__body">{children}</div>
  </article>
);

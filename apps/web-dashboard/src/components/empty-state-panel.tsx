import type { ReactNode } from "react";

interface EmptyStatePanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export const EmptyStatePanel = ({
  title,
  description,
  actionLabel,
  onAction,
  children
}: EmptyStatePanelProps) => (
  <section className="empty-state-panel" aria-label={title}>
    <div className="empty-state-panel__content">
      <p className="empty-state-panel__eyebrow">Empty state</p>
      <h3 className="empty-state-panel__title">{title}</h3>
      <p className="empty-state-panel__description">{description}</p>
      {children ? <div className="empty-state-panel__meta">{children}</div> : null}
    </div>
    {actionLabel && onAction ? (
      <button type="button" className="button button--solid" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </section>
);

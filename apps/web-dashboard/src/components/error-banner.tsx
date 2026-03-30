import type { ReactNode } from "react";

interface ErrorBannerProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export const ErrorBanner = ({
  title = "加载失败",
  message,
  actionLabel,
  onAction,
  children
}: ErrorBannerProps) => (
  <div className="error-banner" role="alert">
    <div className="error-banner__content">
      <p className="error-banner__eyebrow">Error</p>
      <h3 className="error-banner__title">{title}</h3>
      <p className="error-banner__message">{message}</p>
      {children ? <div className="error-banner__meta">{children}</div> : null}
    </div>
    {actionLabel && onAction ? (
      <button type="button" className="button button--ghost" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);

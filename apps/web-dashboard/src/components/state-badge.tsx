import type { ViewStatusCode } from "../../../../packages/contracts/src/index";

interface StateBadgeProps {
  code: ViewStatusCode | "LOADING";
  label?: string;
}

const toneMap: Record<StateBadgeProps["code"], string> = {
  READY: "success",
  NO_DATA: "warning",
  EMPTY_RESULT: "warning",
  PERMISSION_DENIED: "danger",
  PAUSED: "neutral",
  ERROR: "danger",
  LOADING: "neutral"
};

export const StateBadge = ({ code, label }: StateBadgeProps) => {
  const tone = toneMap[code];

  return (
    <span className={`state-badge state-badge--${tone}`} aria-label={label ?? code}>
      {label ?? code}
    </span>
  );
};
